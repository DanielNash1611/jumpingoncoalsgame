import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Sound: { Events: { COMPLETE: 'complete' } }, Math: { Clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min,n)) } } }));
vi.mock('../src/game/ui/GameHud', () => ({ gameHud: { setStatus: vi.fn(), showChoice: vi.fn() } }));
import { audioManager } from '../src/game/audio/AudioManager';
import { gameState, resetRunState } from '../src/game/state/gameState';
import { BreathPacer } from '../src/game/input/BreathPacer';
import { LeaveAnxiety, type LeaveMoment } from '../src/game/narrative/LeaveAnxiety';
import { trackKeys } from '../src/game/assets/assetConfig';
beforeEach(() => { vi.useRealTimers(); vi.stubGlobal('window', globalThis); audioManager.stop(); resetRunState(); });
describe('player agency and playback', () => {
 it('plays once, enters silence at natural completion, and disposes the sound', () => {
  let complete = () => {}; const sound = { duration: 100, once: vi.fn((_:string, cb:()=>void) => { complete=cb; }), play: vi.fn(), stop: vi.fn(), destroy: vi.fn() };
  const manager = { mute:false, game:{cache:{audio:{exists:()=>true}}}, add:vi.fn(()=>sound) };
  audioManager.init(manager as never); audioManager.play(trackKeys[0]);
  expect(sound.play).toHaveBeenCalledWith({loop:false}); expect(gameState.inSilence).toBe(false);
  complete(); expect(gameState.inSilence).toBe(true); expect(audioManager.getPlaybackProgress()).toBe(1); expect(sound.destroy).toHaveBeenCalledOnce(); expect(manager.add).toHaveBeenCalledOnce();
 });
 it('pauses missing-audio fallback without advancing its clock, then completes after resume', () => {
  vi.useFakeTimers(); vi.spyOn(performance,'now').mockImplementation(()=>Date.now());
  audioManager.init({mute:false,game:{cache:{audio:{exists:()=>false}}}} as never); audioManager.play(trackKeys[0]);
  vi.advanceTimersByTime(10000); audioManager.pause(); vi.advanceTimersByTime(90000); expect(gameState.inSilence).toBe(false);
  audioManager.resume(); vi.advanceTimersByTime(34999); expect(gameState.inSilence).toBe(false); vi.advanceTimersByTime(1); expect(gameState.inSilence).toBe(true); vi.restoreAllMocks();
 });
 for(const moment of ['after-swing','lost-balance','burned','at-hole','return-swing','by-shovel'] as LeaveMoment[]) {
  it(`requires explicit repeated leave choices at ${moment}`,()=>{const choice=new LeaveAnxiety(moment,'Return');choice.begin();expect(choice.update(false,false,false)).toBeNull();for(let i=0;i<3;i++)expect(choice.update(false,true,true)).toBeNull();expect(choice.update(false,true,true)).toBe('leave');choice.begin();expect(choice.update(true,false,true)).toBe('return');});
 }
 it('resets run progress while retaining audio preferences',()=>{gameState.muted=true;gameState.balanceFalls=5;gameState.sparksCollected=7;gameState.bestFlow=9;gameState.cycleCount=3;gameState.endingChoice='leave';resetRunState();expect([gameState.balanceFalls,gameState.sparksCollected,gameState.bestFlow,gameState.cycleCount]).toEqual([0,0,0,0]);expect(gameState.endingChoice).toBeNull();expect(gameState.muted).toBe(true);});
 it('rejects rapid breath mashing, accepts generous pace boundaries, and resets recovery',()=>{const pace=new BreathPacer();expect(pace.register(0).healthy).toBe(false);expect(pace.register(100).healthy).toBe(false);expect(pace.register(2500)).toEqual({healthy:true,streak:1});expect(pace.register(7700)).toEqual({healthy:true,streak:2});pace.reset();expect(pace.register(10100)).toEqual({healthy:false,streak:0});});
});
