import './style.css';
import './register-sw';

import { getPiDigitArray } from "./pi";
import { ControlsView } from "./controls-view";
import { Visualization } from "./visualization";
import { Music } from "./music";
import { Engine } from "./engine";

const engine = new Engine();
const music = new Music(getPiDigitArray());
const allPianoNotes = music.getPianoNotes();
const noteDurations = music.getNoteDurations();
const controlsView = new ControlsView(
    music.getScalesByLength(),
    noteDurations,
    allPianoNotes
);
const vis = new Visualization();

let timeoutIds = [];
let running = false;

controlsView.addButtonClickListener(() => {
    engine.startAudioContext();

    running = ! running;

    controlsView.setButtonLabel(running ? "STOP" : "PLAY");

    setTimeout(() => toggle(running));
});

engine.init().then(() => {
    controlsView.setLoadingComplete();
    controlsView.activateButton();
});

function toggle(running) {
    if (! running) {
        engine.stop();
        timeoutIds.forEach(id => clearTimeout(id));
        timeoutIds = [];
    }
    else {
        vis.clear();
        build();
        engine.play();
    }
}

function build() {
    const scale = controlsView.getScale();
    const bpm = controlsView.getBpm();
    const tonic = allPianoNotes[controlsView.getTonic()];
    const noteDuration = parseFloat(controlsView.getNoteDuration());
    const beatLengthSeconds = 60 / bpm;
    const digitDisplayDelayMs = 0.25 * beatLengthSeconds * 1000;

    const noteOptions = {
        scale,
        beatLengthSeconds,
        tonic,
        noteDuration
    };

    // queue small batch to get music started faster...
    // then two more batches for the remainder of available digits

    const total = 10000;
    const firstBatchSize = 1800;
    const secondaryBatchesSize = (total - firstBatchSize) / 2;
    const secondBatchTimeoutMs = 1000 * ((firstBatchSize * beatLengthSeconds) - 15);
    const thirdBatchTimeoutMs = secondBatchTimeoutMs + (1000 * ((secondaryBatchesSize * beatLengthSeconds) - 15));

    const onNoteDown = (event) => timeoutIds.push(
        setTimeout(
            () => updateDigitDisplay(event),
            digitDisplayDelayMs
        )
    );

    engine.queueNotes(  // 1800 = 2 minutes at 900bpm
        music.generateNotes(noteOptions, 0, firstBatchSize),
        onNoteDown
    );

    timeoutIds.push(
        setTimeout(
            () => engine.queueNotes(
                music.generateNotes(noteOptions, firstBatchSize, firstBatchSize + secondaryBatchesSize),
                onNoteDown
            ),
            secondBatchTimeoutMs
        )
    );
    timeoutIds.push(
        setTimeout(
            () => engine.queueNotes(
                music.generateNotes(noteOptions, firstBatchSize + secondaryBatchesSize, total),
                onNoteDown
            ),
            thirdBatchTimeoutMs
        )
    );

}

function updateDigitDisplay(note) {
    vis.append(note.digit);

    if (note.index % 10 === 0) {
        vis.space();
    }

    if (note.index % 40 === 0 && note.index !== 0) {
        vis.newline();
    }
}
