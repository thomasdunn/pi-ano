import './style.css';

import { Piano } from '@tonejs/piano';
import { Scale, Note } from '@tonaljs/tonal';
import * as Tone from 'tone';
import './register-sw';

const getPiDigits10k = () => getPiDigits(10020n);

// most scales are 7 notes or fewer
// there are 10 digits in base 10
// for 7 note scale we'll have notes for 7 digits in one octave
// we need to go into the next octave for notes 8, 9, 10
// 88 key piano goes from A0 to C8
// we'll make C7 the last selectable tonic knowing we may go slightly out of range of 88 key piano
const octaves = [1, 2, 3, 4, 5, 6];
const chromaticScaleLetters = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const genNotesForOctave = (octave) => chromaticScaleLetters.map(l => {
    const [letter, accidental] = l.split('');
    return letter + (accidental||'') + octave;
});
const allPianoNotes = [ 'A0', 'A0#', 'B0', ...octaves.map(o => genNotesForOctave(o)).flat(), 'C7' ];
console.log(allPianoNotes);
const noteDurations = [
    {name: 'sixteenth (1/16)', duration: 1/16},
    {name: 'eighth (1/8)', duration: 1/8},
    {name: 'quarter (1/4)', duration: 1/4},
    {name: 'half (1/2)', duration: 1/2},
    {name: 'dotted half (3/4)', duration: 3/4},
    {name: 'whole (1)', duration: 1}
];

let currentNote = 0;
let notes = [];
let toneParts = [];
const piDigitArray = ('' + getPiDigits10k()).split(''); // [3, 1, 4, 1, 5, 9, 2, 6, ...];
console.log('piDigitArray', piDigitArray);
const piano = new Piano({
    url: 'audio',
    release: true,
    pedal: true,
    volume: {
        strings: 3,
        harmonics: 3,
        keybed: 3,
        pedal: 3
    }
}).toDestination()

const button = document.querySelector('button');
const numEl = document.querySelector('#number');
const scaleSelect = document.querySelector('#scale');
const bpmRange = document.querySelector('#bpm');
const bpmNumber = document.querySelector('#bpm-number');
const tonicRange = document.querySelector('#tonic');
const tonicLabel = document.querySelector('#tonic-label');
const noteDurationRange = document.querySelector('#note-duration');
const noteDurationLabel = document.querySelector('#note-duration-label');

bpmRange.addEventListener('input', () => {
    bpmNumber.value = bpmRange.value;
});
bpmNumber.addEventListener('input', () => {
    bpmRange.value = bpmNumber.value;
});
tonicRange.addEventListener('input', () => {
    tonicLabel.innerText = allPianoNotes[tonicRange.value];
});
noteDurationRange.addEventListener('input', () => {
    noteDurationLabel.innerText = noteDurations[noteDurationRange.value].name;
});

getScales().forEach(scaleName => {
    const scaleOption = document.createElement('option');
    scaleOption.innerText = scaleName;
    scaleOption.value = scaleName;
    if (scaleName === 'major') {
        scaleOption.selected = true;
    }
    scaleSelect.appendChild(scaleOption);
});

const build = () => {
    const scale = scaleSelect.value;
    const bpm = bpmRange.value;
    const tonic = allPianoNotes[tonicRange.value];
    const noteDuration = noteDurations[noteDurationRange.value].duration;
    const beatLengthSeconds = 60 / bpm;
    const digitDisplayDelayMs = 0.25 * beatLengthSeconds * 1000;

    const options = {
        scale,
        beatLengthSeconds,
        tonic,
        noteDuration
    };

    const queueNotes = (newNotes) => {

        const noteOffNotes = newNotes.map(n => ({
            note: n.note,
            time: n.time + n.duration,
        }));
        const noteOffEvents = new Tone.Part((time, event) => {

            const {note} = event;
            piano.keyUp({note, time});

        }, noteOffNotes).start(0);
        toneParts.push(noteOffEvents);

        const noteOnNotes = newNotes;
        const noteOnEvents = new Tone.Part((time, event) => {

            const {note, velocity} = event;
            piano.keyDown({note, time, velocity});
            setTimeout(updateDigitDisplay, digitDisplayDelayMs);

        }, noteOnNotes).start(0);
        toneParts.push(noteOnEvents);

        notes.push(...newNotes);
    };

    // to start queue up 1000 digits to get it started quickly
    queueNotes(getNotes(options, 0, 1000));

    // on some timeouts queue more batches of notes
    for (let i = 1; i < 10; i++) {
        setTimeout(
            () => queueNotes(getNotes(options, i * 1000, (i + 1) * 1000)),
            // 1000 notes at the max 1200 bpm takes 50 seconds
            // so queue up another batch a while before that...
            i * 40000
        );
    }

};

let running = false;

button.addEventListener('click', (e) => {
    Tone.start();

    running = ! running;

    e.target.textContent = running ? "STOP" : "PLAY";

    setTimeout(() => toggle(running));
});

piano.load().then(() => {
    document.querySelector('#loading').remove()
    button.classList.add('active')
});

function toggle(running) {
    if (! running) {
        Tone.Transport.stop();
        toneParts.forEach(tonePart => {
            tonePart.clear();
            tonePart.dispose();
        });
        toneParts = [];
    }
    else {
        numEl.innerHTML = '';
        build();
        currentNote = 0;
        Tone.Transport.start();
    }
}

function updateDigitDisplay() {
    numEl.innerHTML += notes[currentNote++].piDigit;

    if ((currentNote - 1) % 10 === 0) {
        numEl.innerHTML += '&nbsp;';
    }

    if ((currentNote - 1) % 40 === 0 && currentNote !== 1) {
        numEl.innerHTML += '<br>&nbsp;&nbsp;';
    }
}

function getScales() {
    return Scale.names();
}

function getNotes(options, start, end) {
    const { scale, tonic: tonic1, beatLengthSeconds, noteDuration } = options;
    const [ t1, t2, t3 ] = tonic1.split('');
    const letter = t1;
    const octave = parseInt(t3 || t2, 10);
    const accidental = t3 ? t2 : '';
    const tonic2 = letter + accidental + (octave + 1);
    const scaleNotes = [
            ...Scale.get(tonic1 + ' ' + scale).notes,
            ...Scale.get(tonic2 + ' ' + scale).notes
        ]
        .map(Note.simplify)
        .splice(0, 10);

    const piNotes = piDigitArray
        .slice(start, end)
        .map(i => scaleNotes[i]);

    return piNotes.map((note, i) => (
        {
            piDigit: piDigitArray[start + i],
            note,
            velocity: 1,
            time: beatLengthSeconds * (start + i),
            duration: (noteDuration * beatLengthSeconds)
        }
    ));
}

function getPiDigits(factor) {
    let i = 1n;
    let x = 3n * (10n ** factor);
    let pi = x;
    while (x > 0) {
        x = x * i / ((i + 1n) * 4n);
        pi += x / (i + 2n);
        i += 2n;
    }
    return pi / (10n ** 20n);
}
