var synaptic = require('synaptic');
var path = require('path');
var fs = require('fs');
var parseCSV = require("csv-to-array");
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;

const MAX_X = 10;
const MAX_Y = 10;
let uniqueAPs = 0;
const apIndex = {};
const queries = [];
const inputs = [];

const scrapeFiles = () => {
    const parseData = (data, addUnique) => {
        return data.map(ap => {
            const mac = 'm' + ap.mac.replace(/:/g,'');
            const level = (100 - ap.level.substr(1, 2));
            if (addUnique && apIndex[mac] === undefined) {
                apIndex[mac] = uniqueAPs++;
            }
            return {
                mac,
                level,
            }
        });
    };
    const columns = ["SSID", "mac", "auth", "frequency", "channel", "level"];
    return new Promise((resolve, reject) => {
        let canResolve = false;
        let csvCount = 0;
        let csvProcessed = 0;
        fs.readdir('./', (e, files) => {
            files.forEach((file, index) => {
                if (index === files.length - 1) canResolve = true;
                if (file.substr(-4) !== '.csv') return;
                csvCount ++;
                const filename = file.split('.')[0];
                parseCSV({
                    file: path.join(file),
                    columns: columns
                }, (err, data) => {
                    let it = {};
                    if (filename.indexOf('-') > -1){
                        it.x = +filename.split('-')[0];
                        it.y = +filename.split('-')[1].match(/[0-9]/g).join('');
                        it.data = parseData(data, true),
                        inputs.push(it);
                    }
                    else {
                        it.name = filename;
                        it.data = parseData(data, false),
                        queries.push(it);
                    }
                    csvProcessed ++;
                    if (canResolve && csvProcessed === csvCount) resolve();
                });
            })
        });
    });
}

const makeTrainingSet = (snapshots) => {
    const snaps = snapshots.map(snapshot => {
        return normaliseInput(snapshot);
    });
    return [].concat.apply([], snaps);
}

const normaliseInput = ({data, x, y}) => {
    const normaliseLocation = (x, y) => {
        return [
            x / MAX_X,
            y / MAX_Y,
        ]
    }
    return {
        input: normaliseData(data),
        output: normaliseLocation(x, y),
    }
};

const normaliseData = data => {
    const normaliseLevel = level => {
        return level / 100;
    };
    let ret = Array.apply(null, Array(uniqueAPs)).map(Number.prototype.valueOf,0);
    data.forEach(ap => {
        const isKnown = apIndex[ap.mac] !== undefined ? true : false;
        if (isKnown) ret[apIndex[ap.mac]] = normaliseLevel(ap.level);
    });
    return ret;
};

const normaliseQueries = (queries) => {
    return queries.map(query => {
        return normaliseData(query.data);
    })
};

scrapeFiles().then(() => {
    console.log('inputs', inputs.length);
    console.log('queries', queries.length);
    const trainingSet = makeTrainingSet(inputs);
    console.log('trainingSets', trainingSet.length);

    // console.log('set', trainingSet[3])

    const network = new Architect.Perceptron(uniqueAPs, 14, 8, 2)
    const trainer = new Trainer(network);
    console.time('Training');
    trainer.train(trainingSet,{
        rate: .1,
        iterations: 10000000,
        error: .005,
        shuffle: true,
        log: 10000,
        cost: Trainer.cost.CROSS_ENTROPY
    });
    console.timeEnd('Training');
});