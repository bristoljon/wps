var synaptic = require('synaptic');
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;

const makeAP = () => {
    var SSID = "";
    var level = 50;
    var possible = "ABCDEFGHIJKLMN";
    for (var i=0; i < 1; i++ ) {
        SSID += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    level = Math.floor(Math.random() * 100);
    return {
        SSID,
        level,
    }
};

const makeSnapshot = (x, y) => {
    const limit = 10;
    let apList = [];
    let amount = 5 + Math.floor(Math.random() * (limit - 5));
    while (apList.length < amount) {
        const _ap = makeAP();
        if (apList.every(ap => ap.SSID !== _ap.SSID)) apList.push(_ap);
    };
    return {
        apList,
        x,
        y,
    }
};

const MAX_X = 10;
const MAX_Y = 10;
const MAX_INPUTS = 20;

const ssidIndex = {};

const normaliseInput = (snapshot) => {
    const normaliseSSID = ssid => {
        const next = Object.keys(ssidIndex).length;
        let code = [];
        for (let i = 0; i < MAX_INPUTS; i++) {
            if (i !== next) code.push(0);
            else code.push(1);
        }
        ssidIndex[ssid] = code;
        return code;
    }
    const normaliseLevel = level => {
        return level / 100;
    }
    const normaliseLocation = (x, y) => {
        return [
            x / MAX_X,
            y / MAX_Y,
        ]
    }
    return snapshot.data.map(ap => {
        let ssid, level, input;
        if (ssidIndex[ap.ssid]) ssid = ssidIndex[ap.ssid]
        else ssid = normaliseSSID(ap.ssid)
        level = normaliseLevel(ap.level);
        input = ssid.concat(level);
        output = normaliseLocation(snapshot.x, snapshot.y);
        return {
            input,
            output,
        }
    })
};

const makeTrainingSet = (snapshots) => {
    let ret = [];
    const snaps = snapshots.map(snapshot => {
        return normaliseInput(snapshot);
    });
    return [].concat.apply([], snaps);
}

var network = new Architect.Perceptron(20, 8, 2)
var trainer = new Trainer(network);
var trainingSet;

var path = require('path');
var fs=require('fs');
var parseCSV = require("csv-to-array");

const getSnapshots = () => {
    var columns = ["SSID", "mac", "auth", "frequency", "channel", "level"];
    return new Promise((resolve, reject) => {
        let snapshots = [];
        let canResolve = false;
        let csvCount = 0;
        let csvProcessed = 0;
        fs.readdir('./', (e, files) => {
            files.forEach((file, index) => {
                if (index === files.length - 1) {
                    canResolve = true;
                }
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
                        data,
                    });
                    csvProcessed ++;
                    if (canResolve && csvProcessed === csvCount) resolve(snapshots);
                });
            })
        });
    });
}

const parseData = (data) => {
    return data.map(ap => {
        const ssid = 'm' + ap.mac.replace(/:/g,'');
        const level = +ap.level.substr(1, 2);
        return {
            ssid,
            level,
        }
    })
};

const parseOutput = (output) => {
    return {
        x: output[0] * MAX_X,
        y: output[1] * MAX_Y,
    }
};

const predict = (list) => {
    const outputs = list.map(ap => {
        return network.activate(ap);
    })
    console.log('outputs', outputs);
    const sumX = outputs.reduce((total, ap) => {
        console.log('ap, total', ap, total);
        return ap[0] + total;
    }, 0);
    const sumY = outputs.reduce((total, ap) => {
        console.log('ap, total', ap, total);
        return ap[1] + total;
    }, 0);
    const length = outputs.length;
    return parseOutput([sumX / length, sumY / length]);
}

const test = [
  [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.45 ],
  [ 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.43 ],
  [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.52 ],
  [ 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.79 ],
  [ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.84 ],
  [ 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.87 ],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.81 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.82 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.84 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0.9 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.63 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.84 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.87 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.9 ]
]

getSnapshots().then(snapshots => {
    console.log('resolve', snapshots.length);
    const parsed = snapshots.map(({x, y, data}) => {
        console.log('snapshot x y', x, y);
        return {
            x,
            y,
            data: parseData(data),
        }
    });
    trainingSet = makeTrainingSet(parsed);
    console.log('trainingSets', trainingSet.length);
    trainer.train(trainingSet,{
        rate: .1,
        iterations: 100000,
        error: .005,
        shuffle: true,
        log: 1000,
        cost: Trainer.cost.CROSS_ENTROPY
    });
    // const out = network.activate([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0.75 ])
    // console.log(parseOutput(out));
    console.log(predict(test));
}).catch(e => console.log(e))



