const fetch = require('node-fetch');
const { parse } = require("node-html-parser");
const { gearSites } = require("../settings.json");

async function headgear(game) {
    let url = gearSites.headgear;
    return gearQuery(url, game);
}

async function clothing(game) {
    let url = gearSites.clothing;
    return gearQuery(url, game);
}

async function shoes(game) {
    let url = gearSites.shoes;
    return gearQuery(url, game);
}

async function gearQuery(url, game) {
    switch (game) {
        case 1: 
            url = `${url}`;
            break;
        case 2: 
            url = `${url}_2`;
            break;
        case 3:
            url = `${url}_3`;
            break;
    }

    const response = await fetch(url);

    const dom = parse(await response.text());

    const tables = dom.querySelectorAll("table");

    if (tables.length === 1) {
        return processGearTable(tables[0]);
    }
}

/**
 * 
 * @param {HTMLElement} table 
 */
function processGearTable(table) {
    const rows = table.querySelectorAll("tbody > tr");

    let header = [];
    let content = [];

    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];

        if (i === 0) {
            // this is the header row
            for (let col of row.querySelectorAll("th")) {
                header.push(col.innerText);
            }
        } else {
            // this is a data row
            let allCols = row.querySelectorAll("td");
            let gear = {
                image: "",
                name: "",
                brand: "",
                cost: "",
                ability: "",
                rarity: ""
            };
            for (let colNum = 0; colNum < allCols.length; colNum++) {
                let col = allCols[colNum];

                switch (colNum) {
                    case 0: // this is the picture row
                        let item = col.querySelector("img");
                        item = item.getAttribute("srcset");
                        item = item.split(",");
                        item = item[item.length - 1];
                        item = item.trim().split(" ");
                        item = item[0].trim();

                        gear.image = item.indexOf("http") === 0 ? item : `https:${item}`;
                        break;
                    case 1: // this is the name of the gear
                        gear.name = col.innerText.replace("\n", "").replace("'", "").replace(/&#?[a-z0-9]+;/ig, "").toLowerCase();
                        break;
                    case 2: // this is the brand
                        gear.brand = col.innerText.replace("\n", "").replace("'", "").replace(/&#?[a-z0-9]+;/ig, "").toLowerCase();
                        break;
                    case 3: // this is the cost
                        gear.cost = col.innerText.replace("\n", "").replace("'", "").replace(/&#?[a-z0-9]+;/ig, "").toLowerCase();
                        break;
                    case 4: // this is the primary ability
                        gear.ability = col.innerText.replace("\n", "").replace("'", "").replace(/&#?[a-z0-9]+;/ig, "").toLowerCase();
                        break;
                    case 5: // this is the rarity
                        gear.rarity = col.querySelectorAll("img[alt='Star-empty.png']").length.toString().toLowerCase();
                        break;
                }
            }

            content.push(gear);
        }
    }

    return content;
}

module.exports = {
    headgear,
    clothing,
    shoes
};