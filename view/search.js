const single = true;

function fuzzySearch(query, words, limit = 50) {
    if (!query) return [];

    query = query.toLowerCase();

    return words
        .map(word => {
            const lowerWord = word.toLowerCase();
            let score = 0, index = 0, firstMatch = -1;

            for (let char of query) {
                let foundAt = lowerWord.indexOf(char, index);
                if (foundAt !== -1) {
                    if (firstMatch === -1) firstMatch = foundAt;
                    score += 2;
                    index = foundAt + 1;
                } else {
                    score -= 1;
                }
            }

            let prefixBonus = lowerWord.startsWith(query) ? 10 : 0;
            let positionPenalty = firstMatch;
            let lengthPenalty = lowerWord.length * 0.1;

            score += prefixBonus - positionPenalty - lengthPenalty;

            return { word, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(result => result.word);
}

function contains(query, words, limit = 50) {
    if (!query) return [];
    query = query.toLowerCase();
    return words.filter(word => word.toLowerCase().includes(query)).slice(0, limit);
}

function startsWith(query, words, limit = 50) {
    if (!query) return [];
    query = query.toLowerCase();
    return words.filter(word => word.toLowerCase().startsWith(query)).slice(0, limit);
}

function endsWith(query, words, limit = 50) {
    if (!query) return [];
    query = query.toLowerCase();
    return words.filter(word => word.toLowerCase().endsWith(query)).slice(0, limit);
}

const searchMethods = [fuzzySearch, contains, startsWith, endsWith];
let limit = 100;

let searchMethod = fuzzySearch;

function mkAutocomplete(input, allowNew = false) {
    const container = document.createElement('div');
    container.classList.add('autocomplete-container');
    document.body.appendChild(container);

    const suggestionBox = document.createElement('ul');
    suggestionBox.classList.add('autocomplete-suggestions');
    container.appendChild(suggestionBox);

    let lastResults = [];
    let activeIndex = 0; // Erstes Element immer aktiv

    function updatePosition() {
        const rect = input.getBoundingClientRect();
        container.style.top = `${rect.bottom + window.scrollY}px`;
        container.style.left = `${rect.left + window.scrollX}px`;
        container.style.width = `${rect.width}px`;
    }

    function clearSuggestions() {
        suggestionBox.innerHTML = '';
        container.style.display = 'none';
        activeIndex = 0;
    }

    document.getElementById('search-method').addEventListener('change', function () {
        searchMethod = searchMethods[this.selectedIndex];
        input.dispatchEvent(new Event('input'));
    });

    input.addEventListener('input', function () {
        const query = this.value;
        if (!query) {
            clearSuggestions();
            lastResults = [];
            return;
        }

        let results = searchMethod(query, window.data.namesSorted, 100);

        if (JSON.stringify(results) === JSON.stringify(lastResults)) {
            // Vorschläge haben sich nicht geändert → Verhindert Flackern
            return;
        }
        lastResults = results;

        if (results.length === 0) {
            clearSuggestions();
            return;
        }

        // **Direkt `.active` beim Erstellen setzen → Kein Flackern mehr**
        suggestionBox.innerHTML = results
            .map((word, index) => `<li data-index="${index}"${index === 0 ? ' class="active"' : ''}>${word}</li>`)
            .join('');

        suggestionBox.scrollTop = 0;
        container.style.display = 'block';
        updatePosition();
    });

    input.addEventListener('focus', function () {
        this.select();
    });

    input.addEventListener('keydown', function (event) {
        let items = suggestionBox.querySelectorAll('li');

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
        } else if (event.key === 'Enter') {
            if (items[activeIndex]) {
                input.value = items[activeIndex].textContent;
                clearSuggestions();
                event.preventDefault();
            }
        } else if (event.key === 'Tab') {
            if (allowNew) {
                return;
            }
            if (items[activeIndex]) {
                input.value = items[activeIndex].textContent;
                clearSuggestions();
                const nextInput = input.nextElementSibling;
                if (nextInput) {
                    nextInput.focus();
                }
                event.preventDefault();
            }
        } else if (event.key === 'Escape') {
            clearSuggestions();
        }

        // **Aktive Klasse nur dann aktualisieren, wenn sich die Auswahl ändert**
        items.forEach((item, idx) => {
            if (idx === activeIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    });

    input.addEventListener('blur', function () {
        setTimeout(clearSuggestions, 150);
    });

    suggestionBox.addEventListener('mousedown', function (event) {
        if (event.target.tagName === 'LI') {
            input.value = event.target.textContent;
            clearSuggestions();
            search();
        }
    });

    document.addEventListener('click', function (event) {
        if (!container.contains(event.target) && event.target !== input) {
            clearSuggestions();
        }
    });

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
}

function getName(id) {
    return window.data.names[id];
}

function getId(name) {
    return window.data.names.indexOf(name);
}

function showSingle() {
    return single;
}

function createElementSpan(id, clickable = true) {
    const name = getName(id);
    const el = document.createElement('span');
    el.classList.add('element');
    el.textContent = formatElement(name);
    if (clickable) {
        el.addEventListener('click', function () {
            addSolutions(id);
        });
    }
    return el;
}

function formatBack(name) {
    return name.toLowerCase().replace(/ /g, '_');
}

function formatElement(name) {
    name = name.replace(/_/g, ' ');
    return name.toLowerCase().replace(/(^|[0-9\- ])([a-z])/g, (match, p1, p2) => {
        return p1 + p2.toUpperCase();
    });
}

function addCombination(combination, el) {
    const packed = [];
    let lastId = combination[0];
    let count = 1;

    for (let i = 1; i < combination.length; i++) {
        if (combination[i] === lastId) {
            count++;
        } else {
            packed.push({ id: lastId, count });
            lastId = combination[i];
            count = 1;
        }
    }
    packed.push({ id: lastId, count });
    packed.forEach((item, index) => {
        if (index > 0) {
            el.appendChild(document.createTextNode(' + '));
        }
        el.appendChild(createElementSpan(item.id));
        if (item.count > 1) {
            el.appendChild(document.createTextNode(` ×${item.count}`));
        }
    });
}

function addSolutions(resultId) {
    const el = document.createElement('div');
    el.classList.add('solution');
    el.id = formatBack(getName(resultId));
    const div = document.getElementById(el.id);
    if (div !== null) {
        flashDiv(div);
        return;
    }

    let creates = window.data.create[resultId];
    if (!creates || creates.length === 0) {
        return;
    }
    el.appendChild(createElementSpan(resultId, false));
    el.appendChild(document.createTextNode(' = '));

    for (let i = 0; i < creates.length; i++) {
        if (i > 0) {
            el.appendChild(document.createTextNode(' or '));
        }
        addCombination(creates[i], el);
    }
    const close = document.createElement('span');
    close.classList.add('close');
    close.addEventListener('click', function () {
        el.remove();
    });
    el.appendChild(close);
    el.appendChild(document.createElement('br'));
    document.getElementById('solutions').appendChild(el);
}

function search() {
    const name = document.getElementById('search').value.trim();
    let id = getId(name);
    if (id === -1) {
        id = getId(formatElement(formatBack(name)));
    }
    if (id !== -1) {
        addSolutions(id);
    }
}

function flashDiv(div) {
    div.classList.add('flash');
    setTimeout(() => {
        div.classList.remove('flash');
    }, 500);
}

document.addEventListener('DOMContentLoaded', function () {
    const startElements = ['Fire', 'Water', 'Air', 'Earth'];
    document.getElementById('element-count').textContent = window.data.names.length;
    startElements.forEach(name => {
        const id = getId(name);
        window.data.create[id] = [];
    });
    const input = document.getElementById('search');
    mkAutocomplete(input);

    const searchBtn = document.getElementById('searchbtn');
    searchBtn.addEventListener('click', search);

    window.data.namesSorted = [...window.data.names].sort();

});