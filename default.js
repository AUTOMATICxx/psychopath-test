function $(n){return document.getElementById(n)}
function get(link,callback){
	var xmlhttp=new XMLHttpRequest();
	xmlhttp.open("GET",link,true);
	xmlhttp.onreadystatechange=function(){
		if(xmlhttp.readyState== 4){
			if(xmlhttp.status==200){
				callback(xmlhttp.responseText);
			} else{
				callback(null,xmlhttp.statusText);
			}
		}
	}
	xmlhttp.send(null);
}

function hide(elem){
	elem.style.display = 'none'; 
}

function show(elem){
	elem.style.display = 'block'; 
}

function fade(elem,startOpacity,endOpacity,duration,func){
	if(startOpacity<0) startOpacity=0;
	if(startOpacity>1) startOpacity=1;
	if(endOpacity<0) endOpacity=0;
	if(endOpacity>1) endOpacity=1;
	
	duration=duration*1000;

	elem.style.opacity=startOpacity;
	
	if(duration==0) return;
	
	var startTicks=new Date().getTime();
	
	var iid;
	
	iid=window.setInterval(function(){
		var ticks=new Date().getTime();
		
		var elasped=ticks-startTicks;
		
		if(elasped>duration) elasped=duration;
		
		var opacity=startOpacity + elasped/duration*(endOpacity-startOpacity);
		
		elem.style.opacity=opacity;
		
		if(elasped<duration) return;
		
		window.clearInterval(iid);
		if(func) func()
	},1);
}

var tid;
var nextCall;
var word;
var programStep=0;
var program;

function download(count){
	hide($('introduction'));
	hide($('error'));
	hide($('start'));
	hide($('result'));
	show($('loading'));
	
	get("program.pl?count="+count,function(content,error){
		if(content==null){
			hide($('loading'));
			show($('introduction'));
			show($('error'));
			
			$('error-label').textContent=error;
			return;
		}
		
		program=JSON.parse(content);
		programStep=0;
		startTheTest();
	});
}

function startTheTest(){
	hide($('loading'));
	show($('test'));
	
	word=$('word');
	
	showStep();
}

function finishTheTest(){
	var correct=0;
	var total=program.length;
	var delayGoodTotal=0;
	var delayBadTotal=0;
	var countGood=0;
	var countBad=0;
	var falseStarts=0;
	
	var items=[];

	for(var i in program){
		var step=program[i];
		items[i]={}
		
		if(step.falseStarts){
			items[i].f=step.falseStarts;
			falseStarts+=step.falseStarts;
		}
		
		var c=0;
		if(step.kind==0 && step.ignored){
			c=1;
		} else if(step.kind!=0 && step.reaction){
			c=1;
			
			items[i].r=step.reaction;
			
			if(step.kind==1){
				countGood++;
				delayGoodTotal+=step.reaction;
			} else{
				countBad++;
				delayBadTotal+=step.reaction;
			}
		}
		
		if(c){
			correct++;
			items[i].c=1;
		}
		
		items[i].w=step.word;
		items[i].k=step.kind;
	}
	
	var avgGood=countGood==0?-1:delayGoodTotal/countGood;
	var avgBad=countBad==0?-1:delayBadTotal/countBad;
	
	$('correct-answers').textContent=correct+" our of "+total;
	$('delay-good').textContent=avgGood==-1?"?":avgGood+"ms";
	$('delay-bad').textContent=avgBad==-1?"?":avgBad+"ms";
	$('false-starts').textContent=falseStarts;
	
	get("program.pl?result="+encodeURIComponent(JSON.stringify(items)),function(){});
	
	hide($('test'));
	show($('result'));	
	show($('start'));
}

function timeout(to,func){
	if(to==undefined){
		if(tid!=null){
			window.clearTimeout(tid);
			tid=null;
		}
		
		return;
	}

	tid=window.setTimeout(func,1000*to);
}

function showStep(){
	var step=program[programStep];
	
	if(step==null){
		timeout(2,finishTheTest);
		return;
	}
	
	step.falseStarts=0;

	timeout(step.delay+0.5,function(){
		word.textContent=step.word;
		fade(word,0,1,0.05);
		
		var startTicks=new Date().getTime();
		
		var handler=function(result){
			fade(word,1,0,0.3,function(){word.textContent=""});
			
			if(result==0){
				step.ignored=true;
			} else{
				step.reaction=new Date().getTime()-startTicks;
			}
			
			if((step.kind==0 && step.ignored) || (step.kind!=0 && ! step.ignored)){
				hint($('hint-correct'),"Correct!");
			} else{
				hint($('hint-wrong'),"Wrong!");
			}
			
			programStep++;
			
			showStep();
		}
		nextCall=function(){handler(1)}
		timeout(step.duration,function(){handler(0)});
	});
}

var hintGeneration=0;
function hint(id,text){
	hide($('hint-correct'));
	hide($('hint-wrong'));
	
	var generation=++hintGeneration;
	
	id.textContent=text;
	show(id);
	fade(id,0,1,0.2,function(){
		if(generation!=hintGeneration) return;
		
		fade(id,1,0.85,0.45,function(){
			if(generation!=hintGeneration) return;
			
			fade(id,0.85,0,0.2,function(){
				if(generation!=hintGeneration) return;
				
				hide(id);
			});
		});
	});
}

window.addEventListener("keydown", function(ev){
	if(ev.keyCode!=32) return;
	
	if(nextCall==null && program!=null && program[programStep]!=null){
		hint($('hint-wrong'),"Too early!");
		program[programStep].falseStarts=1+program[programStep].falseStarts;
		return;
	}
	
	if(nextCall==null || tid==null)
		return;
	
	timeout();
	
	var toCall=nextCall;
	nextCall=null;
	toCall();
	
}, false);









