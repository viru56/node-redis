const restify = require('restify');
const server = restify.createServer();
const exec = require('child_process').exec;
const redis = require('redis');
// const fs = require('fs');
// const readLine = require('readline');
// const stream = require('stream');
// const instream = fs.createReadStream('final.txt');
// const outstream = new stream();
// const rl = readLine.createInterface(instream, outstream);
server.pre(restify.pre.sanitizePath());
server.use(restify.plugins.queryParser({ mapParams: true }));
server.use(restify.plugins.bodyParser());
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const client = redis.createClient(
	// {
	// 	port: '40648',
	// 	host: '10.11.241.1',
	// 	password: 'r6gPNYoHcdPGSqOr'
	// }
);
client.on('connect', function () {
	console.log('Redis client connected');
	// client.dbsize((err, data) => {
	// 	if (err) {
	// 		console.log('err in dbsize', err);
	// 	}
	// 	console.log('dbsize', data);
	// });
	// inseart data in redis db
	// inseartData();
});
// function inseartData() {
// 	console.log('start insert data in redis db');
// 	rl.on('line', function (line) {
// 		const row = line.split('\n');
// 		const data = row[0].split(' ');
// 		client.set(data[1], data[2], (err) => {
// 			if (err) {
// 				console.log(err);
// 				rl.close();
// 			}
// 		});
// 	});
// 	rl.on('close', () => {
// 		client.keys('*', (err, keys) => {
// 			if (err) {
// 				console.log('err in getting keys: ', err);
// 			} else {
// 				console.log('total entries: ', keys.length);
// 			}
// 		});
// 	});
// }

client.on('error', function (err) {
	console.log('Something went wrong ' + err);
	client.quit();
});


server.get('/', function (req, res, next) {
	res.send('welcome to tax-experiment');
	return next();
})
server.post('/calculatetax', function (req, res, next) {
	let country = req.body.country;
	let product = req.body.product;
	let invoice_amount = req.body.invoice_amount;

	const tax = 0.0;
	const rate = 0.0;

	crc_val = CRC32.str(product + country);
	rate = client.get(crc_val, function (error, result) {
		if (error) {
			console.log(error);
			throw error;
		}
		return result
	});
	tax = invoice_amount * (parseFloat(rate / 100));
	out_data = { "invoice_amount": invoice_amount, "tax": tax, "total_amount": parseFloat(tax) + parseFloat(invoice_amount) };
	res.send(out_data);
	return next();

});
server.get('/count', function (req, res, next) {
	client.keys('*', (err, keys) => {
		if (err) {
			res.send({ 'error': err });
		} else {
			res.send({ 'count': keys.length });
		}
	});
	return next();
});
server.post('/add', function (req, res, next) {
	const key = req.body ? req.body.key : null;
	const value = req.body ? req.body.value : null;
	if (key && value) {
		client.set(key, value, (err, ok) => {
			if (err) {
				res.send({
					err, key, value
				})
			} else {
				res.send({ 'message': 'value added successfully' });
			}
		});

	} else {
		res.send({ 'err': 'invalid data' });
	}
	return next();
});
server.post('/getByKey', function (req, res, next) {
	console.log(req.body);
	const key = req.body.key;
	if (typeof (key) === 'string' && key.length > 0) {
		client.get(key, (err, data) => {
			if (err) {
				res.send(err);
			} else {
				res.send(data);
			}
		});
		return next();

	} else {
		res.send({ 'error': 'invalid key' });
	}
})
server.get('/dbsize', function (req, res, next) {
	client.dbsize((err, data) => {
		if (err) {
			res.send({ 'err': err });
		}
		res.send({ 'dbsize': data });
	});
	return next();
})
server.get('/executeCommand', function (req, res, next) {
	const command = req.query.command;
	if (typeof (command) === 'string' && command.length > 0) {
		exec(command, function (err, stdout, stderr) {
			if (err) {
				res.send({ 'error': err });
			} else {
				res.send({
					'stdout: ': stdout,
					'stderr': stderr
				});
			}
		})
	} else {
		res.send({ 'error': 'invalid command' });
	}
	return next();
});
if (cluster.isMaster) {
	console.log(`Master ${process.pid} is running`);

	// Fork workers.
	for (let i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		console.log(`worker ${worker.process.pid} died`);
	});
} else {
	// Workers can share any TCP connection
	// In this case it is an HTTP server

	server.listen(8080, function () {
		console.log('%s listening at %s', server.name, server.url);
	});
	console.log(`Worker ${process.pid} started`);
}