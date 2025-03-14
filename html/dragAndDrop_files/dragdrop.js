var fileUpload = document.querySelector('.upload');
var fileCompare = document.querySelector('.compare');

fileUpload.addEventListener('dragover', function () {
	this.classList.add('drag');
	this.classList.remove('drop', 'done');
});

fileUpload.addEventListener('dragleave', function () {
	this.classList.remove('drag');
});

fileUpload.addEventListener('drop', start, false);
fileUpload.addEventListener('change', start, false);

// Compare drag drop upload

fileCompare.addEventListener('dragover', function () {
	this.classList.add('drag');
	this.classList.remove('drop', 'done');
});

fileCompare.addEventListener('dragleave', function () {
	this.classList.remove('drag');
});

fileCompare.addEventListener('drop', start, false);
fileCompare.addEventListener('change', start, false);

function start() {
	this.classList.remove('drag');
	this.classList.add('drop');
	setTimeout(() => this.classList.add('done'), 3000);
}
