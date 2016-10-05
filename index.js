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

const normaliseInput = ({data, x, y}) => {
    const normaliseLevel = level => {
        return level / 100;
    }
    const normaliseLocation = (x, y) => {
        return [
            x / MAX_X,
            y / MAX_Y,
        ]
    }
    const normalised = data.map(ap => {
        const level = normaliseLevel(ap.level);
        const input = ssidIndex[ap.ssid].concat(level);
        const output = normaliseLocation(x, y);
        return {
            input,
            output,
        }
    });
    // Object.keys(ssidIndex).forEach(ssid => {
    //     let missing = true;
    //     data.forEach(ap => {
    //         if (ap.ssid === ssid) missing = false;
    //     })
    //     if (missing) {
    //         normalised.push({
    //             input: ssidIndex[ssid].concat([1]),
    //             output: normaliseLocation(x, y),
    //         })
    //     }
    // });
    return normalised;
};
const test11 = [ [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.37 ],
  [ 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.43 ],
  [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.65 ],
  [ 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.71 ],
  [ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.69 ],
  [ 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.75 ],
  [ 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.78 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.66 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.78 ],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.78 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.75 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.69 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0.8 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0.82 ] ];

const test00 = [ [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.45 ],
  [ 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.43 ],
  [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.52 ],
  [ 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.79 ],
  [ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.84 ],
  [ 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.87 ],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.81 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.82 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.84 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.63 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.84 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.87 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0.99 ] ];


const makeTrainingSet = (snapshots) => {
    const snaps = snapshots.map(snapshot => {
        return normaliseInput(snapshot);
    });
    return [].concat.apply([], snaps);
}

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
                const x = filename.split('-')[0];
                const y = filename.split('-')[1];
                parseCSV({
                    file: path.join(file),
                    columns: columns
                }, (err, data) => {
                    snapshots.push({
                        x,
                        y,
                        data: parseData(data),
                    });
                    csvProcessed ++;
                    if (canResolve && csvProcessed === csvCount) resolve(snapshots);
                });
            })
        });
    });
}

const parseData = (data) => {
    const parsed = data.map(ap => {
        const ssid = 'm' + ap.mac.replace(/:/g,'');
        const level = +ap.level.substr(1, 2);
        if (!ssidIndex[ssid]) {
            ssidIndex[ssid] = true;
            uniqueAPs ++;
        }
        return {
            ssid,
            level,
        }
    });
    // Generate normalised code for each unique ssid
    Object.keys(ssidIndex).forEach((ssid, next) => {
        let code = [];
        for (let i = 0; i < uniqueAPs; i++) {
            if (i !== next) code.push(0);
            else code.push(1);
        };
        ssidIndex[ssid] = code;
    });
    return parsed;
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

    var network = new Architect.Perceptron(uniqueAPs + 1, 12, 2)
    var trainer = new Trainer(network);
    var trainingSet = makeTrainingSet(snapshots);

    console.log('trainingSets', trainingSet.length);

    console.log('ssidIndex', Object.keys(ssidIndex).length);
    // console.log(trainingSet);

    const getInput = (x, y) => {
        return trainingSet.filter(set => {
            return set.output[0] === x && set.output[1] === y;
        }).map(set => {
            return set.input;
        })
    }

    // console.log(getInput(1,1));

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
            return network.activate(ap);
        });
        const sumX = outputs.reduce((total, ap) => { return ap[0] + total }, 0);
        const sumY = outputs.reduce((total, ap) => { return ap[1] + total }, 0);
        const length = outputs.length;
        return parseOutput([sumX / length, sumY / length]);
    };

    console.log('11 - no added', predict(test11));
    console.log('00 - no added', predict(test00));

    console.log('11', predict(getInput(1,1)));
    console.log('00', predict(getInput(0,0)));
    console.log('10', predict(getInput(1,0)));
    console.log('01', predict(getInput(0,1)));

}).catch(e => console.log(e))



