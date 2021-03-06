// ==UserScript==
// @name         Redmine Gantt Fold
// @namespace    http://eksi273.com/
// @version      1.3.1
// @description  Issue group folding for redmine gantt charts 
// @author       Fatih Kurt
// @include      http*://*
// @grant        none
// ==/UserScript==
var leftInd = 20;
var topInd = 20;
var base = 0;
var subjects = $(".gantt_subjects").children().addClass("ondisp");
var tasks = $(".task, .tooltip");
var busy =0;
var serialized = [];
var filter = "";
var keys = [];
var keyhandle = {parent:{},input:{},evnt:{}};
var tryy = 0;
function getFoldFunc(tree){
    return function(){
        if(busy) return;
        busy = 1;
        console.log(tree);
        try{
            if(tree.fold){
                showTree(tree);
                tree.fold = 0;
            }
            else{
                hideTree(tree);
                tree.fold = 1;
            }
            orderAll();
        }catch(err){orderAll();}
        busy = 0;
    }
}
function createTrees(){
    var getTop = function(el){return $(el).cssUnit("top")[0]}
    var getLeft = function(el){return $(el).cssUnit("left")[0]}
    base = getTop(subjects[0]);
    var parents = [];
    var parent = undefined;
    var roots = [];
    for(var i in subjects){
        if(isNaN(i*1)) break;
        var t = {top:getTop(subjects[i]),
            left:getLeft(subjects[i]),
            subject:subjects[i],tasks:[],childs:[],
            hidden:0,fold:0,parent:undefined,filter:0,
            text:subjects[i].textContent.toLowerCase()};
        if(!parent){
            parent = t;
            roots.push(parent);
            root = parent;
            parents.push(parent);
        }
        var diff = t.left-parent.left;
        switch(diff){
            case leftInd:
                parent.childs.push(t);
                t.parent = parent;
                break;
            case leftInd*2:
                var last = parent.childs[parent.childs.length-1];
                parent = last;
                t.parent = parent;
                parents.push(parent);
                parent.childs.push(t);
                break;
            case 0:
                if(root != parent){
                    parent = parent.parent;
                    t.parent = parent;
                    parent.childs.push(t);
                }
                break;
            default:
                for(var i=0;i<=(-diff/leftInd);i++) parent = parent.parent;
                t.parent = parent;
                if(parent) parent.childs.push(t);
                else{
                    root = t;
                    roots.push(t);
                    parent = root;
                }
                break;
        }
        for(var ii in tasks){
            if(isNaN(ii*1)) break;
            var task = tasks[ii*1];
            if(getTop(task)==t.top){
                t.tasks.push(task);
                var newt = " " + task.textContent.toLowerCase().replace(/(\r\n|\n|\r)/gm," ");
                t.text += newt;
                }
        }
        serialized.push(t);
    }
    return roots;
} 
function hideTree(tree){
    if(tree.childs.length) 
        $(tree.subject).removeClass("open");
    for(var i in tree.childs){
        if(tree.childs[i].fold == 0){
            hideTree(tree.childs[i]);
            tree.childs[i].fold = 0;
        }
        hideLine(tree.childs[i]);
    }
    tree.fold = 1;
}
function showTree(tree){
    if(tree.childs.length) 
        $(tree.subject).addClass("open");
     for(var i in tree.childs){
        if(tree.childs[i].fold == 0) showTree(tree.childs[i]);
        showLine(tree.childs[i]);
    }
    tree.fold = 0;
}
function hideLine(line){
    $(line.subject).addClass("hiddentask").removeClass("ondisp").hide();
    line.hidden = 1;
    for(var i in line.tasks)
        $(line.tasks[i]).addClass("hiddentask").hide();
}
function showLine(line){
    if(line.filter) return;
    line.hidden = 0;
    $(line.subject).removeClass("hiddentask").addClass("ondisp").show();
    for(var i in line.tasks)
        $(line.tasks[i]).removeClass("hiddentask").show();
}
function orderAll(){
    var cr = 0;
    for(var i in serialized){
        if(serialized[i].hidden) cr++;
        else{
            $(serialized[i].subject).css("top",(base+i*topInd-cr*topInd)+"px");
            for(var ii in serialized[i].tasks)
                $(serialized[i].tasks[ii]).css("top",(base+i*topInd-cr*topInd)+"px");
        }
    }
    return;
}
function setFnc(tree){
    if(tree.childs.length){
        $(tree.subject).css("cursor","pointer").addClass("open")
        .children().first().addClass("icon icon-folder")
        .removeClass("icon-issue");
        $(tree.subject).on("click",getFoldFunc(tree));
    for(var i in tree.childs) setFnc(tree.childs[i]);
    }
}
function start(){
    if($("[name=description]").attr("content") != "Redmine") return;
    if(document.URL.search("/issues/gantt")<0) return;
    var trees = createTrees();
    for(var i in trees) setFnc(trees[i]);
    createFilter();
    orderAll();
}
function createFilter(){
    var el = {};
    var timer = 0;
    var showParents = function(tree){
        var a = tree;
        while(a.parent){
            if(a.parent.hidden){
                a.parent.filter = 0;
                showLine(a.parent);
            }
            a = a.parent;
        }
    }
    var ochn = function(){
        if(busy&&tryy<20){tryy++;setTimeout(this,50);return;}
        busy = 1;
        tryy = 0;
        filter = keyhandle.input.val().toLowerCase();
        if(!filter.length){
            for(var i in serialized){
                serialized[i].filter = 0;
                showLine(serialized[i]);
                }
            orderAll();
            busy = 0;
            return;
            }
        for(var i in serialized){
            hideLine(serialized[i]);
            serialized[i].filter=1;
            }
        for(var i in serialized) 
            if(serialized[i].text.search(filter)>=0){
                serialized[i].filter=0;
                showLine(serialized[i]);
                showParents(serialized[i]);
                showTree(serialized[i]);
            }
        addKeys(filter);
        listKeys();
        orderAll();
        busy = 0;
    }
    var ochn1 = function(){
        try{clearTimeout(timer)} catch(err){}
        timer = setTimeout(ochn,500);
        };
    el = $("#sidebar").children().first().before("<h3>Filter Results</h3><ul></ul>")
        .parent().find("ul").first();
    var v = el.append("<li><strong>Search:</strong><input type='text' class='small' style='z-index:999;'\
     placeholder='Keywords'></li>").children().find("input").on("keydown",ochn1);
    console.log(v);
    var kys = el;
    keys = getKeys();
    keyhandle.parent = kys;
    keyhandle.input = el.find("input");
    keyhandle.evnt = ochn;
    listKeys();
}
function addKeys(key){
    if(keys.indexOf(key)>=0) return;
    keys.push(key);
    if(keys.length>9) keys = keys.splice(1,keys.length-1)
    localStorage["keys"] = JSON.stringify(keys);
}
function removeKey(key){
    var i = keys.indexOf(key);
    if(i>0) keys.splice(i,i);
    localStorage["keys"] = JSON.stringify(keys);
}
function getKeys(){
    return (localStorage["keys"]?JSON.parse(localStorage["keys"]):new Array());
}
function listKeys(){
    var fnc = function(val){
        return function(){
            keyhandle.input.val(val);
            keyhandle.evnt();
        }
    }
    var remfnc = function(key){
        return function(evnt){
            console.log(evnt);
            $(evnt.target).parent().remove();
            removeKey(key);
        }
    }
    var k = keyhandle.parent.children();
    for(var ii in k) if(ii*1>0) $(k[ii]).remove();
    for(var i in keys)
        keyhandle.parent.append('<li><span class="icon icon-del"></span><a href="#">'+keys[i]+'</a></li>')
            .children().last().find("a").on("click",fnc(keys[i]))
            .parent().find(".icon-del").on("click",remfnc(keys[i])).css("cursor","pointer");

}

start();
//setTimeout(start,500);
