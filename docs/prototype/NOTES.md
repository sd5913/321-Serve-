# v0.1 — Rice rhythm prototype

Date: 2026-11-12

## Storyboard

0–2 s: count-in. 2–18 s: one rice ball every two beats. 18–26 s: one every beat. 26–28 s: transition rest. 28–35 s: oversized hands squeeze on every second beat, yellow abstract background. 35–38 s: transition rest. 38–45.5 s: final beat sequence. 47 s: results.

## Asset provenance

Kitchen, belt, plate, loose rice, formed rice, hand sprites and on-beat artwork were downloaded from the user-supplied Figma file wDOcRmw9hqUAvnOOdLzmeV (Background 13 / 196:140 and its image fills). Original PNGs are preserved. Hand poses use the original 3 × 2 sprite sheet. Dynamic expressions, anger symbols, particles and timing HUD are drawn with Canvas. Two other inspected source images contained baked checkerboard backgrounds and are not used by this prototype.

## Implementation

Plain HTML/CSS/Canvas JavaScript. Web Audio currentTime drives scheduling and hit judgment; suspend/resume freezes the audio timeline. Leaving the tab pauses automatically. Visual shake never changes note timestamps. Synthesized kick, bass, pulse and hit sounds are generated locally after the user starts.

## Remaining art/playtest work

Replace synthetic track with approved composed music and author its chart; tune input windows on real devices; refine hand poses and transitions toward the supplied abstract references; test touch ergonomics and game feel with players. The prototype currently supports one fixed level, without persistence or an editor.
