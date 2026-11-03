<div class="home-page-circle-1"></div>
<div class="home-page-circle-2"></div>
<div class="home-page-circle-3"></div>
<div class="right_bottom_circle"></div>

<style>
	.home-page-circle-1,
	.home-page-circle-2,
	.home-page-circle-3,
	.right_bottom_circle {
		position: absolute;
		border-radius: 50%;
		z-index: -1;
		pointer-events: none;
	}

	.home-page-circle-1 {
		width: 400px;
		height: 400px;
		left: -200px;
		top: -100px;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-1 15s ease-in-out infinite alternate;
	}

	.home-page-circle-2 {
		width: 600px;
		height: 600px;
		right: -300px;
		top: -200px;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-2 20s ease-in-out infinite alternate;
	}

	.home-page-circle-3 {
		width: 300px;
		height: 300px;
		left: 10%;
		bottom: 10%;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-3 12s ease-in-out infinite alternate;
	}

	.right_bottom_circle {
		width: 200px;
		height: 200px;
		right: 5%;
		bottom: 5%;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-4 18s ease-in-out infinite alternate;
	}

	@keyframes pulse-1 {
		0% {
			transform: scale(1);
			opacity: 0.05;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.08;
		}
		100% {
			transform: scale(1);
			opacity: 0.05;
		}
	}

	@keyframes pulse-2 {
		0% {
			transform: scale(1);
			opacity: 0.04;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.07;
		}
		100% {
			transform: scale(1);
			opacity: 0.04;
		}
	}

	@keyframes pulse-3 {
		0% {
			transform: scale(1);
			opacity: 0.06;
		}
		50% {
			transform: scale(1.15);
			opacity: 0.09;
		}
		100% {
			transform: scale(1);
			opacity: 0.06;
		}
	}

	@keyframes pulse-4 {
		0% {
			transform: scale(1);
			opacity: 0.05;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.08;
		}
		100% {
			transform: scale(1);
			opacity: 0.05;
		}
	}
</style>
