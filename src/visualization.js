export class Visualization {

    constructor()
    {
        this.display = document.querySelector('#number');
    }

    append(text) {
        this.display.innerHTML += text;
    }

    clear() {
        this.display.innerHTML = '';
    }

    space() {
        this.append('&nbsp;');
    }

    newline() {
        this.append('<br>&nbsp;&nbsp;');
    }
}
