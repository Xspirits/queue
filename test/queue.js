var queue = require('queue')
, chai = require('chai')
, spies = require('chai-spies')
, expect = chai.expect;

chai.use(spies);

describe('Queue specs', function() {

  this.timeout(500);

  beforeEach(function() {
    queue = queue.createQueue('test-queue');
  });

  afterEach(function() {
    queue.destroy();
  });

  it('should process job', function(done) {
    queue
      .define('test-task')
      .action(function (job, cb) {cb();});

    job = queue.create('test-task');

    queue.on('complete', function () {
      expect(queue.store.get()).to.have.length(0);
      expect(queue.store.get(job.id)).to.not.be.ok;
      done();
    });
  });

  it('should process saved job', function(done) {
    queue
      .define('test-task')
      .action(function (job, cb) {cb();});

    queue.on('complete', function () {
      expect(queue.store.get()).to.have.length(0);
      expect(queue.store.get(job.id)).to.not.be.ok;
      done();
    });

    queue.store.save(['job-1']);
    queue.store.set('job-1', {type: 'test-task'});
    queue.start();

  });

  it('should retry a failed job', function(done) {
    var action = function (job, cb) {
        if (job.retry === 1) return cb('boom');
        cb();
      };

    action = chai.spy(action);

    queue
      .define('test-task')
      .interval('10ms')
      .retry(1)
      .action(action);

    queue
      .create('test-task')
      .on('complete', function () {
        expect(action).to.have.been.called.twice;
        done();
      });
  });

  it('should fail after max-retry', function(done) {
    var action = function (job, cb) {cb('boom');};
    action = chai.spy(action);

    queue
      .define('test-task')
      .retry(2)
      .action(action);

    queue
      .create('test-task')
      .on('error', function () {
        expect(action).to.have.been.called.exactly(3);
        done();
      });
  });

  it('should fail after lifetime expired', function(done) {
    var action = function (job, cb) {cb('boom');};
    action = chai.spy(action);

    queue
      .define('test-task')
      .retry(Infinity)
      .lifetime('10ms')
      .interval('20ms')
      .action(action);

    queue
      .create('test-task')
      .on('error', function () {
        done();
      });
  });

  it('should fail if last more than timeout', function(done) {
    var action = function (job, cb) {
      setTimeout(function() {cb();}, 100);
    };

    queue
      .define('test-task')
      .timeout('10ms')
      .action(action);

    queue
      .create('test-task')
      .on('done', function () {
        done('should not be called');
      })
      .on('error', function () {
        done();
      });
  });

});

