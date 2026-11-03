from PIL import Image,ImageDraw,ImageFont
import subprocess,os
F="/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf"
def f(s,b=False):return ImageFont.truetype(F%("-Bold" if b else ""),s)
URL="https://goalworld.fun/blast-radius/"
BG=(10,10,18)
def card(lines,name):
    im=Image.new("RGB",(1920,1080),BG);d=ImageDraw.Draw(im);y=300
    for t,s,b,c in lines:
        w=d.textlength(t,font=f(s,b));d.text(((1920-w)/2,y),t,font=f(s,b),fill=c);y+=s+40
    im.save(name);return name
def cap(src,text,name):
    im=Image.open(src).convert("RGB")
    if im.size!=(1920,1080):
        bg=Image.new("RGB",(1920,1080),BG);im.thumbnail((1920,1000));bg.paste(im,((1920-im.width)//2,0));im=bg
    d=ImageDraw.Draw(im,"RGBA");d.rectangle([0,990,1920,1080],fill=(0,0,0,215))
    d.text((40,1012),text,font=f(34,True),fill=(255,255,255))
    t="LIVE · "+URL+"  ·  MOCK INFERENCE";w=d.textlength(t,font=f(24))
    d.text((1880-w,1022),t,font=f(24),fill=(255,190,90));im.save(name);return name
S=[]
S.append((card([("CanonGuard · Blast Radius Zero",84,True,(255,255,255)),("Vultr Agent Rush · Track: Blast Radius Zero",40,False,(180,180,220)),("LIVE: "+URL,40,False,(120,230,160)),("Inference: MOCK (honest badge) · Sandbox: Docker one-shot",34,False,(255,190,90))],"f00.png"),9))
S.append((cap("01_landing.png","Live landing — INFERENCE: MOCK and SANDBOX: DOCKER badges","f01.png"),12))
S.append((card([("GET /blast-radius/api/health",50,True,(255,255,255)),('inference_mode: "mock"  ·  model: "mock"',40,False,(255,190,90)),('sandbox_mode: "docker"  ·  image: alpine:3.20',40,False,(120,230,160)),("allowlist: list_canon, read_canon (read-only)",36,False,(200,200,230)),("denied: write_canon · http_fetch · exec_shell",36,False,(255,120,120)),("--network=none --read-only --cap-drop=ALL --user=65534",32,False,(180,180,220))],"f02.png"),12))
seq=[("good_top","Demo 01 · Canon-true scene → PASS"),("good_s0","PASS · 2 executed · 0 blocked · host_writes 0 · network none"),("good_s1","Tool timeline: every allowed call in a one-shot container"),
("bad_top","Demo 02 · Broken continuity → REVISE"),("bad_s0","REVISE · 6 findings · write_canon blocked by policy"),("bad_s1","Continuity findings: wrist coil, scar, badge"),("bad_s2","Blocked write never executed — host_writes 0"),
("escape_top","Demo 03 · Prompt-injection escape attempt"),("escape_s0","path_escape blocked: ../../etc/passwd, /root/.ssh/id_rsa"),("escape_s1","write_canon, http_fetch, exec_shell → tool_not_allowlisted"),("escape_s2","5 blocked · 0 host writes · network none — blast radius zero"),
("mobile","Mobile viewport — same live UI")]
for i,(n,t) in enumerate(seq):S.append((cap(n+".png",t,f"f{i+3:02d}.png"),10))
S.append((card([("Blast radius: zero.",80,True,(255,255,255)),("host_writes 0 · network none · escapes blocked before they exist",38,False,(120,230,160)),(URL,40,False,(255,190,90)),("Living Canon · Fractured Code / The Neural Wars",32,False,(180,180,220))],"f99.png"),10))
with open("list.txt","w") as o:
    for n,d in S:o.write(f"file '{n}'\nduration {d}\n")
    o.write(f"file '{S[-1][0]}'\n")
subprocess.run("ffmpeg -y -loglevel error -f concat -i list.txt -f lavfi -i anullsrc=r=48000:cl=stereo -vf \"fps=30,format=yuv420p\" -c:v libx264 -crf 20 -preset medium -c:a aac -b:a 64k -shortest -movflags +faststart out.mp4",shell=True,check=True)
Image.open("f01.png").save("cover.png")
