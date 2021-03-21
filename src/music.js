import {Note, Scale, ScaleType} from "@tonaljs/tonal";

export class Music {
    constructor(digits) {
        this.digits = digits;
    }

    getNoteDurations() {
        return [
            {name: 'sixteenth (1/16)', duration: 1/16},
            {name: 'eighth (1/8)', duration: 1/8},
            {name: 'quarter (1/4)', duration: 1/4},
            {name: 'half (1/2)', duration: 1/2},
            {name: 'dotted half (3/4)', duration: 3/4},
            {name: 'whole (1)', duration: 1}
        ];
    }

    getPianoNotes() {
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
        return [
            'A0', 'A0#', 'B0',
            ...octaves.map(o => genNotesForOctave(o)).flat(),
            'C7'
        ];
    }

    getScalesByLength() {
        const scales = new Map();

        ScaleType.all().forEach(scale => {
            if (! scales.has(scale.intervals.length)) {
                scales.set(scale.intervals.length, []);
            }
            scales.get(scale.intervals.length).push(scale.name);
        });

        return Array.from(scales.entries());
    }

    generateNotes(options, start, end) {
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

        const noteNames = this.digits
            .slice(start, end)
            .map(i => scaleNotes[i]);

        return noteNames.map((note, i) => (
            {
                digit: this.digits[start + i],
                note,
                velocity: 1,
                time: beatLengthSeconds * (start + i),
                duration: (noteDuration * beatLengthSeconds)
            }
        ));
    }

}
