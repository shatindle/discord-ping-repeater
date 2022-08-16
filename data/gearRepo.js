const { headgear, clothing, shoes } = require("./splatoonWikiApi");
const Fuse = require("fuse.js");

let items = {
    splatoon2: [],
    index: {
        splatoon2: {}
    },
    words: {
        splatoon2: 1
    },
    validCharacters: {
        splatoon2: ""
    }
};

let searchApi = new Fuse(items.splatoon2, {
    keys: ["name"],
    threshold: 1
});

function permutator(inputArr) {
    let result = [];
  
    function permute(arr, m = []) {
        if (arr.length === 0) {
            result.push(m)
        } else {
            for (let i = 0; i < arr.length; i++) {
                let curr = arr.slice();
                let next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next))
            }
        }
   }
  
   permute(inputArr);
  
   return result.map(v => v.join(" "));
}

async function refreshGear() {
    items.splatoon2 = [
        ...(await headgear(2)),
        ...(await clothing(2)),
        ...(await shoes(2))
    ];

    items.index.splatoon2 = {};

    items.splatoon2.forEach(t => items.index.splatoon2[t.name.split(" ")[0]] = true);

    const y = items.splatoon2.map(t => t.name.split(" ").length).sort();

    items.words.splatoon2 = y[y.length - 1];

    let allWords = "";

    items.splatoon2.forEach(t => allWords += t.name + " ");

    allWords = allWords.replace(/\s+/g, "");

    items.validCharacters.splatoon2 = [...new Set([...allWords])];

    let tempIndex = items.splatoon2.map(t => t.name).reduce((acc,curr)=> (acc[curr]=true,acc),{});

    // after all of this, generate all combinations of all of the names since people can mess up the order
    [...items.splatoon2].forEach(item => {
        const parts = item.name.split(" ");

        const allCombos = permutator(parts);

        allCombos.forEach(combination => {
            if (!tempIndex[combination]) {
                items.splatoon2.push({
                    ...item,
                    name: combination
                });
                tempIndex[combination] = true;
            }
        });
    })

    searchApi = new Fuse(items.splatoon2, {
        keys: ["name"],
        threshold: 0.1
    });
}

const emojiRegex = /(<a?)?:\w+:(\d{18,19}>)?/g;
const roleRegex = /<@&\d{18,19}>/g;
const userRegex = /<@\d{18,19}>/g;

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

async function searchGear(searchText) {
    if (!searchText) return;

    searchText = searchText
        .replace(emojiRegex, " ")
        .replace(roleRegex, " ")
        .replace(userRegex, " ")
        .replace(/\s\s+/g, " ")
        .toLowerCase();

    searchText = searchText.split("").filter(t => items.validCharacters.splatoon2.indexOf(t) > -1 || t === " ").join("");

    const candidates = Object.keys(items.index.splatoon2).map(t => searchText.indexOf(t)).filter(t => t > -1);

    if (candidates.length === 0) return "";

    const allCandidates = [];

    for (let candidate of candidates) {
        // these are the indexes of potential candidates
        const startOfWords = searchText.substring(candidate);
        const words = startOfWords.split(" ");

        for (let i = items.words.splatoon2; i > 0; i--) {
            let result = attemptResult(words, i);
            if (result.length > 0) allCandidates.push(result[0].item.image);
        }
    }

    return allCandidates.filter(onlyUnique);
}

function attemptResult(words, length) {
    let ourSentence = "";

    for (let i = 0; i < words.length; i++) {
        if (i >= length) break;

        let word = words[i];

        ourSentence += `${word} `;
    }

    ourSentence = ourSentence.trim();

    return searchApi.search(ourSentence);
}

refreshGear();

// refresh the gear once every 24 hours
setInterval(refreshGear, 86400000);

module.exports = {
    searchGear
};