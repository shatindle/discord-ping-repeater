const { headgear, clothing, shoes } = require("./splatoonWikiApi");
const Fuse = require("fuse.js");

let items = {
    splatoon2: []
};

let searchApi = new Fuse(items.splatoon2, {
    keys: ["name"],
    threshold: 1
});

async function refreshGear() {
    items.splatoon2 = [
        ...(await headgear(2)),
        ...(await clothing(2)),
        ...(await shoes(2))
    ];

    searchApi = new Fuse(items.splatoon2, {
        keys: ["name"],
        threshold: 1
    });
}

async function searchGear(searchText) {
    const result = searchApi.search(searchText);

    if (result.length > 0) return result[0].item.image;

    return "";
}

refreshGear();

// refresh the gear once every 24 hours
setInterval(refreshGear, 86400000);

module.exports = {
    searchGear
};