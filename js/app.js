
var conf = {
	height: 606, // Height of canvas
	width: 505, // Width of canvas
	rows: 6, // Number of tile rows
	cols: 5, // Number of tile columns
	rowStep: 83, // Height of a row
	colStep: 101, // Width of a column
	stoneRows: [1,2,3], // Sequence numbers of rows where bugs move and collectibles appear
	speedRange: [100,200], // enemy speed range
	enemyMinStart: -800, // Determines the maximum time of enemy reappearal
	enemyNumber: 4, // Number of enemies
	defaultTime: 60 // Default time of a game in seconds
};

// Enemies our player must avoid
var Enemy = function() {
    this.x = Math.random() * conf.enemyMinStart;
    this.width = 80;
    this.updateY();
    this.updateSpeed();
    this.sprite = 'images/enemy-bug.png';
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function(dt) {
	this.x = this.x + dt*this.speed;
	if (this.x > conf.width){
		this.x = Math.random() * conf.enemyMinStart;
		this.updateY();
		this.updateSpeed();
	}
	if (this.collision(player)){
		player.resetPosition();
		lives.decrease();
	}
};

Enemy.prototype.updateY = function(){ // Randomly choose new row 
	this.rowIndex = conf.stoneRows[Math.floor(Math.random()*conf.stoneRows.length)];
	this.y = this.rowIndex * conf.rowStep - 20;
};

Enemy.prototype.updateSpeed = function(){ // Randomly update speed
	var timeMultiplier = (60 - time.value)/5;
	this.speed = Math.random()*[conf.speedRange[1]-conf.speedRange[0]]*timeMultiplier + conf.speedRange[0];
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

Enemy.prototype.collision = function(player){ // Return true if entity collides with player
	var vertical = this.rowIndex == player.rowIndex;
	var horizontal = this.x + this.width > player.x && this.x < player.x + player.width;
	return vertical && horizontal;
};

// Player class
var Player = function(){
	this.sprite = 'images/char-boy.png';
	this.width = 80;
	this.resetPosition();
};

Player.prototype = Object.create(Enemy.prototype); // Delegete render method to enemy

Player.prototype.resetPosition = function(){
	this.colIndex = 3; // Player's current position column
	this.rowIndex = 5; // Player's current position row
};

Player.prototype.update = function(){
	if (this.rowIndex === 0){ // Trying to step on the water tile
		this.resetPosition();
		lives.decrease();
	} else {
		this.x = this.colIndex * conf.colStep;
		this.y = this.rowIndex * conf.rowStep - 20;
	}
};

Player.prototype.handleInput = function(key){
    switch (key){
    	case "left":
    		this.colIndex = Math.max(player.colIndex - 1, 0);
    		break;
		case "up":
			this.rowIndex = Math.max(player.rowIndex - 1, 0);
			break;
		case "right":
			this.colIndex = Math.min(player.colIndex + 1, conf.cols - 1);
			break;
		case "down":
			this.rowIndex = Math.min(player.rowIndex + 1, conf.rows - 1);
			break;
    }
};

var Collectible = function(){ // Gems and extra lives
	this.width = conf.colStep;
	this.hidden = true; 
	this.reloadingTime = 3; 
};

Collectible.prototype = Object.create(Enemy.prototype); // Uses updateY and collision methods

Collectible.prototype.render = function(){
	if (!this.hidden){
		ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
	}	
};

Collectible.prototype.update = function(dt){
	if (this.hidden && Math.random() < dt/this.reloadingTime){ // Unhide in a new position
		this.hidden = false;
		this.updateY();
		this.x = Math.floor(Math.random()*conf.cols) * conf.colStep;
	}
	if (!this.hidden && this.collision(player)){ // Collision detection
		this.hidden = true;
		this.collect();
	}
};

var Gem = function(){
	this.sprite = 'images/Gem Blue.png';
	Collectible.call(this);
};

Gem.prototype = Object.create(Collectible.prototype);

Gem.prototype.collect = function(){ // What happens if player collects (collides) with it
	score.increase();
};

var Heart = function(){
	this.sprite = 'images/Heart2.png';
	Collectible.call(this);
	this.reloadingTime = 20;
};

Heart.prototype = Object.create(Collectible.prototype);

Heart.prototype.collect = function(){ // What happens if player collects (collides) with it
	if (lives.value < 3) 
		lives.value += 1;
};

var StateText = function(val,x){ // Score and time texts on top of the board
	this.value = val;
	this.x = x;
	this.y = 30;
};

StateText.prototype.render = function(){
	ctx.fillStyle = "white";
	ctx.fillRect(this.x,0,conf.width,50);
    ctx.font = '26pt Calibri';
    ctx.textAlign = "start";
    ctx.fillStyle = "grey";
    ctx.fillText(this.text, this.x, this.y);
    ctx.strokeStyle = "grey";
    ctx.strokeText(this.text,this.x,this.y);
};

var Score = function(){
	StateText.call(this,0,0);
};

Score.prototype = Object.create(StateText.prototype);

Score.prototype.increase = function(){
	this.value += 1;
};

Score.prototype.update = function(){
	this.text = "Score: " + this.value;
};

var Time = function(){
	StateText.call(this,conf.defaultTime,150); 
};

Time.prototype = Object.create(StateText.prototype);

Time.prototype.update = function(dt){
	if (this.value >= 0)
		this.value -= dt;
	this.text = "Time: " + (Math.floor(this.value)+1);
};

Time.prototype.someLeft = function(){
	return this.value > 0;
};

var Lives = function(){ // Keeps track of and renders nubmer of lives left.
	this.value = 3;
	this.sprite = 'images/Heart2.png';
};

Lives.prototype.increase = function(){
	this.value += 1;
};

Lives.prototype.decrease = function(){
	this.value -= 1;
};

Lives.prototype.render = function(){
	var y = -84,
		xStart = conf.width - 80,
		xStep = 60;

	for (var i = 0; i < this.value; i++){
		ctx.drawImage(Resources.get(this.sprite), xStart - i*xStep, y);	
	}
};

// Return false and trigger end of the game if player is out of lives
Lives.prototype.stillAlive = function(){ 
	return this.value > 0;
};

// Class for drawing "GAME OVER" text in the end of game
var GameOver = function(){ 
	this.fontSize = 0;
	this.finalFontSize = 50;
	this.x = conf.width/2;
	this.y = 280;
	this.text = "GAME OVER";
};

GameOver.prototype.update = function(dt){
	if (this.fontSize < this.finalFontSize)
		this.fontSize += this.finalFontSize*dt*2;
};

GameOver.prototype.render = function(){
    ctx.font = 'bold ' + this.fontSize + 'pt Arial';
    ctx.textAlign = "center";
    ctx.fillStyle = "red";
    ctx.fillText(this.text, this.x, this.y);
    ctx.strokeStyle = "yellow";
    ctx.strokeText(this.text,this.x,this.y);
};

var time = new Time();
var allEnemies = [];
for (var i = 0; i < conf.enemyNumber; i++){
	allEnemies.push(new Enemy());
}
var player = new Player();
var gem = new Gem();
var heart = new Heart();
var score = new Score();
var lives = new Lives();
var gameOver = new GameOver();

// Event listeners for moving player
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
    };

    player.handleInput(allowedKeys[e.keyCode]);
});

