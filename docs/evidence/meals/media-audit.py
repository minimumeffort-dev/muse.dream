"""Run with Pillow and ffmpeg; source captures stay in the ignored media cache."""
import hashlib, json, re, subprocess, sys
from pathlib import Path
from PIL import Image

frames=sorted(Path('.npm-cache/media/meals').glob('[0-9][0-9][0-9][0-9].png'))
assert [f.name for f in frames]==[f'{i:04}.png' for i in range(480)]
for frame in frames:
    with Image.open(frame) as im: assert im.size==(2400,1350)
with Image.open('docs/media/meals.gif') as im:
    assert im.size==(1280,720)
    gif_frames=im.n_frames
    duration=0
    for i in range(gif_frames):
        im.seek(i)
        duration+=im.info['duration']
assert gif_frames==480 and duration==16000
with Image.open('docs/media/meals.jpg') as im: assert im.size==(2400,1350)
result=subprocess.run([sys.argv[1] if len(sys.argv)>1 else 'ffmpeg','-i','docs/media/meals.mp4','-map','0:v:0','-f','null','-'],capture_output=True,text=True,check=True)
assert '1600x900' in result.stderr and '30 fps' in result.stderr
video_frames=int(re.findall(r'frame=\s*(\d+)',result.stderr)[-1])
assert video_frames==480
files=[*frames,*map(Path,['docs/media/meals.gif','docs/media/meals.mp4','docs/media/meals.jpg'])]
records=[{'file':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
output={'sourceFramesSha256':hashlib.sha256(json.dumps(records[:480],separators=(',',':')).encode()).hexdigest(),'method':'Native 30-rendered-frame-per-simulation-second DEV export, no interpolation; not live FPS','sourceFrames':480,'sourceResolution':[2400,1350],'videoFrames':video_frames,'videoResolution':[1600,900],'gifFrames':gif_frames,'gifResolution':[1280,720],'gifDurationMs':duration,'stillSourceFrame':90,'files':[records[i] for i in [0,90,479,480,481,482]]}
Path('docs/evidence/meals/media.json').write_text(json.dumps(output,indent=2)+'\n')
print({k:v for k,v in output.items() if k!='files'})
