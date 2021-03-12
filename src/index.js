import './style.css';

import { Piano } from '@tonejs/piano';
import { Scale, ScaleType, Note } from '@tonaljs/tonal';
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
const noteDurations = [
    {name: 'sixteenth (1/16)', duration: 1/16},
    {name: 'eighth (1/8)', duration: 1/8},
    {name: 'quarter (1/4)', duration: 1/4},
    {name: 'half (1/2)', duration: 1/2},
    {name: 'dotted half (3/4)', duration: 3/4},
    {name: 'whole (1)', duration: 1}
];
const c4Index = 39;
const c7Index = 75;

let currentNote = 0;
let notes = [];
let toneParts = [];
const piDigitArray = ('' + getPiDigits10k()).split(''); // [3, 1, 4, 1, 5, 9, 2, 6, ...];
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

let noteBatchTimeoutIds = [];

const button = document.querySelector('button');
const numEl = document.querySelector('#number');
const scaleSelect = document.querySelector('#scale');
const bpmRange = document.querySelector('#bpm');
const bpmNumber = document.querySelector('#bpm-number');
const tonicSelect = document.querySelector('#tonic');
const noteDurationSelect = document.querySelector('#note-duration');

bpmRange.addEventListener('input', () => {
    bpmNumber.value = bpmRange.value;
});
bpmNumber.addEventListener('input', () => {
    bpmRange.value = bpmNumber.value;
});

getScalesByLength().forEach(([length, scales]) => {
    const scaleOptionGroup = document.createElement('optgroup');
    scaleOptionGroup.label = `${length} note scales`;
    scales
        .sort((s1, s2) => s1.localeCompare(s2))
        .forEach(scaleName => {
            const scaleOption = document.createElement('option');
            scaleOption.innerText = scaleName;
            scaleOption.value = scaleName;
            if (scaleName === 'major') {
                scaleOption.selected = true;
            }
            scaleOptionGroup.appendChild(scaleOption);
        });

    scaleSelect.appendChild(scaleOptionGroup);
});

for (let i = 0; i <= c7Index; i++) {
    const tonicOption = document.createElement('option');
    tonicOption.value = i;
    tonicOption.innerText = allPianoNotes[i];
    if (i === c4Index) {
        tonicOption.selected = true;
    }
    tonicSelect.appendChild(tonicOption);
}

for (let i = 0; i <= 5; i++) {
    const noteDurationOption = document.createElement('option');
    noteDurationOption.value = noteDurations[i].duration;
    const text = noteDurations[i].name;
    noteDurationOption.innerText = text;
    if (text.startsWith('quarter')) {
        noteDurationOption.selected = true;
    }
    noteDurationSelect.appendChild(noteDurationOption);
}

const build = () => {
    const scale = scaleSelect.value;
    const bpm = bpmRange.value;
    const tonic = allPianoNotes[tonicSelect.value];
    const noteDuration = parseFloat(noteDurationSelect.value);
    const beatLengthSeconds = 60 / bpm;
    const digitDisplayDelayMs = 0.25 * beatLengthSeconds * 1000;

    const options = {
        scale,
        beatLengthSeconds,
        tonic,
        noteDuration
    };

    const queueNotes = (newNotes) => {

        console.log('queuing notes...');

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

    // queue small batch to get music started faster...
    // then two more batches for the remainder of available digits

    const total = 10000;
    const firstBatchSize = 1800;
    const secondaryBatchesSize = (total - firstBatchSize) / 2;
    const secondBatchTimeoutMs = 1000 * ((firstBatchSize * beatLengthSeconds) - 15);
    const thirdBatchTimeoutMs = secondBatchTimeoutMs + (1000 * ((secondaryBatchesSize * beatLengthSeconds) - 15));

    queueNotes(getNotes(options, 0, firstBatchSize)); // 1800 = 2 minutes at 900bpm

    noteBatchTimeoutIds.push(
        setTimeout(
            () => queueNotes(getNotes(options, firstBatchSize, firstBatchSize + secondaryBatchesSize)),
            secondBatchTimeoutMs
        )
    );
    noteBatchTimeoutIds.push(
        setTimeout(
            () => queueNotes(getNotes(options, firstBatchSize + secondaryBatchesSize, total)),
            thirdBatchTimeoutMs
        )
    );

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
        notes = [];
        noteBatchTimeoutIds.forEach(id => clearTimeout(id));
        noteBatchTimeoutIds = [];
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

function getScalesByLength() {
    const scales = new Map();

    ScaleType.all().forEach(scale => {
       if (! scales.has(scale.intervals.length)) {
           scales.set(scale.intervals.length, []);
       }
       scales.get(scale.intervals.length).push(scale.name);
    });

    return Array.from(scales.entries());
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
