import json,subprocess,time,base64,urllib.request,websocket
p=subprocess.Popen(["google-chrome","--headless=new","--no-sandbox","--disable-gpu","--remote-debugging-port=9333","--user-data-dir=/tmp/brz/prof","about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(3)
t=[x for x in json.load(urllib.request.urlopen("http://127.0.0.1:9333/json")) if x["type"]=="page"][0]
ws=websocket.create_connection(t["webSocketDebuggerUrl"],suppress_origin=True)
i=[0]
def c(m,**pa):
    i[0]+=1;ws.send(json.dumps({"id":i[0],"method":m,"params":pa}))
    while True:
        r=json.loads(ws.recv())
        if r.get("id")==i[0]:return r.get("result",{})
def ev(js):return c("Runtime.evaluate",expression=js,awaitPromise=True,returnByValue=True).get("result",{}).get("value")
def shot(n,full=False):
    d=c("Page.captureScreenshot",format="png",captureBeyondViewport=full)
    open(f"/tmp/brz/{n}.png","wb").write(base64.b64decode(d["data"]))
def vp(w,h,mob=False):c("Emulation.setDeviceMetricsOverride",width=w,height=h,deviceScaleFactor=1,mobile=mob)
vp(1920,1080);c("Page.enable")
c("Page.navigate",url="https://goalworld.fun/blast-radius/");time.sleep(5)
shot("01_landing")
print(ev("fetch('/blast-radius/api/health').then(r=>r.text())"))
for k in ["good","bad","escape"]:
    ev(f"document.querySelector('[data-demo={k}]').click()");time.sleep(1)
    ev("document.getElementById('run').click()");time.sleep(7)
    ev("window.scrollTo(0,0)");shot(f"{k}_top")
    h=ev("document.body.scrollHeight");print(k,h,ev("document.body.innerText.slice(0,1500)"))
    for j,y in enumerate(range(900,int(h),900)):
        ev(f"window.scrollTo(0,{y})");time.sleep(1);shot(f"{k}_s{j}")
vp(430,932,True);ev("window.scrollTo(0,0)");time.sleep(1);shot("mobile")
p.kill()
