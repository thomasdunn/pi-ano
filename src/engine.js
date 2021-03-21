import {Piano} from "@tonejs/piano";
import * as Tone from "tone";

export class Engine {
    constructor() {
        this.notes = [];
        this.toneParts = [];
    }

    init() {
        this.piano = new Piano({
            url: 'audio',
            release: true,
            pedal: true,
            volume: {
                strings: 3,
                harmonics: 3,
                keybed: 3,
                pedal: 3
            }
        }).toDestination();

        return this.piano.load();
    }

    queueNotes(notes, onNoteDown, onNoteUp) {

        console.log('queuing notes...');

        let nextNoteIndex = this.notes.length;

        const noteOnNotes = notes.map(note => ({
            ...note,
            index: nextNoteIndex++
        }));

        this.notes.push(...noteOnNotes);

        const noteOffNotes = noteOnNotes.map(note => ({
            ...note,
            time: note.time + note.duration
        }));

        this.toneParts.push(
            new Tone.Part((time, event) => {

                const {note, velocity} = event;
                this.piano.keyDown({note, time, velocity});
                if (onNoteDown) {
                    onNoteDown(event);
                }

            }, noteOnNotes).start(0)
        );

        this.toneParts.push(
            new Tone.Part((time, event) => {

                const {note} = event;
                this.piano.keyUp({note, time});
                if (onNoteUp) {
                    onNoteUp(event);
                }

            }, noteOffNotes).start(0)
        );
    }

    getNote(index) {
        return this.notes[index];
    }

    startAudioContext() {
        Tone.start();
    }

    play() {
        Tone.Transport.start();
    }

    stop() {
        Tone.Transport.stop();

        this.toneParts.forEach(tonePart => {
            tonePart.clear();
            tonePart.dispose();
        });
        this.toneParts = [];
        this.notes = [];
    }

}
