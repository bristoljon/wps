var synaptic = require('synaptic');
var path = require('path');
var fs = require('fs');
var parseCSV = require("csv-to-array");
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;

const MAX_X = 10;
const MAX_Y = 10;
let uniqueAPs = 0;
const ssidIndex = {};

const normaliseLevel = level => {
    return (100 - level) / 100;
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
    let ret = Array.apply(null, Array(uniqueAPs)).map(Number.prototype.valueOf,0);
    data.forEach(ap => {
        const isKnown = ssidIndex[ap.ssid] !== undefined ? true : false;
        if (isKnown) ret[ssidIndex[ap.ssid]] = normaliseLevel(ap.level);
    });
    return ret;
}

const makeTrainingSet = (snapshots) => {
    const snaps = snapshots.map(snapshot => {
        return normaliseInput(snapshot);
    });
    return [].concat.apply([], snaps);
}

let queries = [];

const getSnapshots = () => {
    var columns = ["SSID", "mac", "auth", "frequency", "channel", "level"];
    return new Promise((resolve, reject) => {
        let snapshots = [];
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
                        it.x = filename.split('-')[0];
                        it.y = filename.split('-')[1].match(/[0-9]/g).join('');
                        it.data = parseData(data, true),
                        snapshots.push(it);
                    }
                    else {
                        it.name = filename;
                        it.data = parseData(data, false),
                        queries.push(it);
                    }
                    csvProcessed ++;
                    if (canResolve && csvProcessed === csvCount) resolve(snapshots);
                });
            })
        });
    });
}

const normaliseQueries = (queries) => {
    return queries.map(query => {
        return normaliseData(query.data);
    })
}

const parseData = (data, addUnique) => {
    return data.map(ap => {
        const ssid = 'm' + ap.mac.replace(/:/g,'');
        const level = +ap.level.substr(1, 2);
        if (addUnique && ssidIndex[ssid] === undefined) {
            ssidIndex[ssid] = uniqueAPs++;
        }
        return {
            ssid,
            level,
        }
    });
};

const parseOutput = (output) => {
    return {
        x: (output[0] * MAX_X).toFixed(2),
        y: (output[1] * MAX_Y).toFixed(2),
    }
};

getSnapshots().then(snapshots => {
    console.log('snapshots', snapshots.length);
    console.log('uniqueAPs', uniqueAPs);
    console.log('queries', queries.length);

    var network = new Architect.Perceptron(uniqueAPs + 1, 4, 2)
    var trainer = new Trainer(network);
    var trainingSet = makeTrainingSet(snapshots);

    console.log('trainingSets', trainingSet.length);
    console.log('trainingSet0', trainingSet[0]);

    console.log('ssidIndex', Object.keys(ssidIndex).length);

    const getInput = (x, y) => {
        return trainingSet.filter(set => {
            return set.output[0] === x && set.output[1] === y;
        }).map(set => {
            return set.input;
        })
    }

    // console.log(normaliseQueries(queries));
    // console.log('ssidIndex', ssidIndex);

    console.time('Training');
    trainer.train(trainingSet,{
        rate: .1,
        iterations: 50000,
        error: .005,
        shuffle: true,
        log: 10000,
        cost: Trainer.cost.CROSS_ENTROPY
    });
    console.timeEnd('Training');

    const predict = (list) => {
        const outputs = list.map(ap => {
            const output = network.activate(ap);
            return output;
        });
        const sumX = outputs.reduce((total, ap) => { return ap[0] + total }, 0);
        const sumY = outputs.reduce((total, ap) => { return ap[1] + total }, 0);
        const length = outputs.length;
        return parseOutput([sumX / length, sumY / length]);
    };

    console.log('11', predict(getInput(0.9,0.9)));
    console.log('00', predict(getInput(0.1,0.1)));
    console.log('10', predict(getInput(0.9,0.1)));
    console.log('01', predict(getInput(0.1,0.9)));

    console.log('shelf', predict(normaliseQueries(queries)[0]));
    console.log('bed', predict(normaliseQueries(queries)[1]));
    console.log('armchair', predict(normaliseQueries(queries)[2]));
    console.log('sofa', predict(normaliseQueries(queries)[3]));

}).catch(e => console.log(e))

// document.getElementsByClassName('zoomableimagewrapper')[0].addEventListener('mousemove', e => console.log(e.offsetX, e.offsetY))
