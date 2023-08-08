#!/usr/bin/env node

import APIAdapter from "./rest_adapter.js";
import fs from "fs";
import { program } from "commander";
import { LowSync } from 'lowdb'
import { JSONFileSync } from 'lowdb/node'
import nodemailer from 'nodemailer'

(async () => {
    const r = new APIAdapter();

    program
        .name("skyscrapper")
        .requiredOption("-q, --query <string>", "path to query json file")
        .requiredOption("-u, --user-email <string>", "email user to send notifications")
        .requiredOption("-o, --password-email <string>", "email password to send notifications")
        .option("-d, --database <string>", "path to database file", "./db.json");

    program.parse(process.argv);

    const opts = program.opts();

    const db = new LowSync(new JSONFileSync(opts.database), {
        quotes: []
    })

    const query = fs.readFileSync(opts.query);

    const cheapest_quote = await findCheapestQuote(r, query);

    db.read()
    const { quotes } = db.data

    let cur_min = {
        minPrice: { amount: Infinity }
    }

    for (let q of quotes) {
        if (q.minPrice.amount < cur_min.minPrice.amount) {
            cur_min = q
        }
    }

    if (cheapest_quote.minPrice.amount < cur_min.minPrice.amount) {
        console.log("new all time low")
    }

    db.data.quotes.push(cheapest_quote)

    db.write()
})()

const priceUnitNormalizationTable = {
    "PRICE_UNIT_UNSPECIFIED": -1,
    "PRICE_UNIT_WHOLE": 1,
    "PRICE_UNIT_CENTI": 100,
    "PRICE_UNIT_MILLI": 1000,
    "PRICE_UNIT_MICRO": 1000000
}

function normalizePrice(price) {
    let newPrice = price;
    const unitRelation = priceUnitNormalizationTable[price.unit];

    if (unitRelation < -1) {
        throw Error(`${price} has unspecified unit`)
    }

    newPrice.amount = price.amount / unitRelation;
    newPrice.unit = "PRICE_UNIT_WHOLE"

    return newPrice;
}

async function findCheapestQuote(r, query) {
    let cheapest_quote = null;

    let res = await r.makeRequest("POST", "flights/indicative/search", query);

    const search = res.data;

    if (search.status != "RESULT_STATUS_COMPLETE")
        return;

    const quotes = search.content.results.quotes;

    for (let quote_id in quotes) {
        const quote = quotes[quote_id];
        quote.minPrice = normalizePrice(quote.minPrice);

        let current_lowest_price = cheapest_quote ? cheapest_quote.minPrice.amount : Infinity;

        if (quote.minPrice.amount < current_lowest_price)
            cheapest_quote = quote;
    }

    return cheapest_quote;
}

