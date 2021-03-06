// ==UserScript==
// @name         重大抢课微辅助
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  I. 删除提交时的确认提示; II. 添加"重复上次提交"按钮，因延迟提交失败时可以直接重复上次提交的内容（可跨网页、跨域名共用，支持的网址见@match）; III. 弹出选老师窗口中添加"快速选择"按钮，一键选择+确定; IV. 选择选课页面后自动点击检索按钮
// @author       ZZJ
// @match        *://202.202.1.41/*
// @match        *://jxgl.cqu.edu.cn/*
// @match        *://222.198.128.126/*
// @match        *://202.202.1.176/*
// @require      https://cdn.staticfile.org/jquery/2.1.4/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// ==/UserScript==

//TODO 添加插件下拉菜单开关各个功能
    //TODO 添加打开/home.aspx时自动点击登陆
//TODO 非限和通识每次点检索时尝试自动输入验证码

const SCR_HEADER = "重大抢课微辅助";
//* 各种功能开关 -------------------------------------------
//* I. 删除提交时的确认提示 ----------------------------------
const Delete_Submit_Prompt = true; 
//* II. 添加"重复上次提交"按钮 ----------------------------------
const Append_Resubmit_Button = true;
const Last_Submit_Table_Storage_Key = //* 储存oTable的innerHTML
{
    'xk' : "oTableInfo_xk", //* 存储选课程otable的信息（上次提交内容）对应的key
    'yy' : "oTableInfo_yy", //* 存储选英语otable的信息（上次提交内容）对应的key
    'fx' : "oTableInfo_fx", //* 存储选非限otable的信息（上次提交内容）对应的key
    'ts' : "oTableInfo_ts" //* 存储选通识otable的信息（上次提交内容）对应的key
};
const Last_Submit_DOM_Storage_Key = //* 储存DOM组件checkbox和显示文字的input
{
    'xk' : 'DOMInfo_xk',
    'yy' : 'DOMInfo_yy',
    'fx' : 'DOMInfo_fx',
    'ts' : 'DOMInfo_ts'
};
//* III. 弹出窗口中添加"快速选择"按钮 ---------------------------
const Append_Fast_Choose_Button = true;
//* IV. 自动点击检索按钮 -------------------------------------
const Auto_Click_Search = true;
//* -----------------------------
//* 开启Debug功能后会在console输出信息
const DEBUG_MODE = true;
//* ------------------------------------------------------

//* 需要前面的prefix才能用，如 input.button
const BTN_CLASS = "ZZJBtn";
const BTN_CSS = 
`input.${BTN_CLASS} {
    font-family: "宋体";
    font-size: 12px;
    cursor: pointer;
    height: 20px;
    margin-left: 7px;
}
`;

function log(msg){
    if (DEBUG_MODE){
        let d = new Date();
        console.log("[" + SCR_HEADER + "] " + msg + " " + d.getHours + ":" + d.getMinutes + ":" + d.getSeconds);
    }
};

function error(msg){
    if (DEBUG_MODE){
        let d = new Date();
        console.error("[" + SCR_HEADER + "] " + msg + " " + d.getHours + ":" + d.getMinutes + ":" + d.getSeconds);
    }
};


//* 清空脚本存储的记录，
function clearResubmitStorage() {
    GM_deleteValue(Last_Submit_Table_Storage_Key['xk']);
    GM_deleteValue(Last_Submit_Table_Storage_Key['yy']);
    GM_deleteValue(Last_Submit_Table_Storage_Key['fx']);
    GM_deleteValue(Last_Submit_Table_Storage_Key['ts']);
    GM_deleteValue(Last_Submit_DOM_Storage_Key['xk']);
    GM_deleteValue(Last_Submit_DOM_Storage_Key['yy']);
    GM_deleteValue(Last_Submit_DOM_Storage_Key['fx']);
    GM_deleteValue(Last_Submit_DOM_Storage_Key['ts']);
}

(function() {
    'use strict'; // 严格模式下使用未定义的变量会报错
    // if (name = 'frmMain') {
    //     console.log(SCR_HEADER + this.location.pathname);
    // }
    // if (name == 'frmRpt'){
    //     console.log(SCR_HEADER + this.location.pathname);
    // }

    //* I. 删除提交时的提示 -------------------------------------------------
    if (Delete_Submit_Prompt && name == 'frmRpt'){
        
        //* 删掉frmRpt(/wsxk/stu_btx_rpt.aspx)里的ChkValue(theObj)里的 
        //* str: if (!confirm('是否提交记录？'))return false;
        //* regEx: /if \(!confirm\('是否提交记录？'\)\)return false;/
        //* 即可
        //* 专业课 frmRpt(/wsxk/stu_btx_rpt.aspx)  对应scripts[1]
        //* 通识 frmRpt(/wsxk/stu_xszx_rpt.aspx))  对应scripts[3]
        //* 英语 frmRpt(/wsxk/stu_btx_rpt.aspx))
        //* 非限 frmRpt(/wsxk/stu_btx_rpt.aspx))
        var tpe = null;
        if (this.location.pathname == "/wsxk/stu_btx_rpt.aspx"){
            tpe = 1;
        }else if(this.location.pathname == "/wsxk/stu_xszx_rpt.aspx"){
            tpe = 3;
        }
        if (tpe) {
            // 先找到对应的script元素，用删掉文字后的标签替换原标签
            var scr = this.document.createElement("script");
            scr.innerHTML = document.scripts[tpe].innerHTML.replace("if (!confirm('是否提交记录？'))return false;", "");

            document.scripts[tpe].replaceWith(scr);

            if (document.scripts[tpe].text.search("是否提交记录")==-1){
                log("已删除提交确认框！");
            }else{
                error("未删除提交确认框！");
            }    
        }
    }
    //* -----------------------------------------------------------------
    
    //* II. "重复上次提交"按钮 ---------------------------------------------
    if (Append_Resubmit_Button && name == 'frmMain'){
        var leixing = null; // 是哪个类型的页面：xk, ts, yy, fx
        switch (this.location.pathname) {
            case "/wsxk/stu_btx.aspx": // 专业课
                leixing = "xk";
                break;
            case "/wsxk/stu_whszk.aspx": // 英语
                leixing = "ts";
                break;
            case "/wsxk/stu_yytgk_bx.aspx": // 通识
                leixing = "yy";
                break;
            case "/wsxk/stu_ggrxk.aspx": // 非限
                leixing = "fx";
                break;
            default:
                break;
        }
        if (leixing) {
            
            //* 专业课 (frmMain(/wsxk/stu_btx.aspx) frmRpt(/wsxk/stu_btx_rpt.aspx))
            //* 通识(frmMain(/wsxk/stu_whszk.aspx) frmRpt(/wsxk/stu_xszx_rpt.aspx))
            //* 英语(frmMain(/wsxk/stu_yytgk_bx.aspx) frmRpt(/wsxk/stu_btx_rpt.aspx))
            //* 非限(frmMain(/wsxk/stu_ggrxk.aspx) frmRpt(/wsxk/stu_btx_rpt.aspx))
            
            // console.log(this.location.pathname);
            //* 为了保证多开网页能通用，存在GM storage里。
            //TODO 不同域名的网站也要通用？--> 利用GM_setValue和GM_getValue, 而不存储在localStorage里
            //* 在提交旁边加上重复上次提交按钮，提交按钮按下时先在 GM storage 存下 frmMain(/wsxk/stu_btx.aspx) -> frmRpt(/wsxk/stu_btx_rpt.aspx) -> id=oTable 的innerHTML，点击重复提交时先从storage里调取覆盖，再执行提交按钮对应的onclick，
            
            var subBtn = null; // 提交按钮，含提交的窗口加载出来时就会赋值
            var oTable = null; // 所有选课内容的表格
            //* 找到提交按钮
            for (const btn of document.querySelectorAll(".button")) {
                if (btn.value == "提交"){
                    subBtn = btn;
                    log("获取提交按钮");
                    break;
                }
            }
    
            if (subBtn != null) {
                //* 找到提交按钮，新按钮才能添加
                //* II.1. 设计样式并添加 "重新提交" 按钮 ------------------------------------------
                //* 添加新按钮的css
                GM_addStyle(BTN_CSS);
        
                //* 新按钮的元素
                var resubBtn = document.createElement("input");
                resubBtn.setAttribute("class", BTN_CLASS);
                // resubBtn.setAttribute("class", "button");
                resubBtn.setAttribute("type", "button");
                resubBtn.setAttribute("name", "submit");
                resubBtn.setAttribute("value", "重复上次提交");
                resubBtn.setAttribute("leixing", leixing); // 确定当前页面类型，用于存储oTable在不同的key里面
                
                //* 修改整体宽度
                subBtn.parentElement.setAttribute("width", 700);
    
                //* 添加到 提交 后面
                insertAfter(resubBtn, subBtn);
                log("已添加重复上次提交" + leixing + "按钮。");
    
                //* II.2. 设置重新提交按钮按下时的逻辑 ---------------------------------
                //* 先覆盖当前oTable的信息（修改innerHTML），再调用提交按钮的onclick函数

                resubBtn.onclick = function(subBtn){
                    return function(){
                        var val = GM_getValue(Last_Submit_Table_Storage_Key[leixing]);
                        if (val != null) {
                            //* 读取 oTable:
                            var oTable = frmRpt.document.getElementById("oTable"); // 选课表格对应的元素，含表格的窗口(frmRpt)加载出来时就会赋值
                            oTable.innerHTML = val;
    
                            //* 读取checkbox的checked和input的value信息
                            var tmp = JSON.parse(GM_getValue(Last_Submit_DOM_Storage_Key[leixing]));
                            var chkKCs = oTable.querySelectorAll("input[type='checkbox']");
                            for (const chkKCi of chkKCs) {
                                chkKCi.checked = tmp[chkKCi.id];
                            }

                            var chkSKBJstrs = oTable.querySelectorAll("input[type='text']");
                            for (const chkSKBJstr of chkSKBJstrs) {
                                chkSKBJstr.value = tmp[chkSKBJstr.id];
                            }
    
                            log("成功读取" + leixing + "_信息。");
                            
                            subBtn.onclick();
                        }else{
                            error(leixing + "_信息不存在！");
                        }
                    };
                }(subBtn);
                
                
            }else {
                error("未能添加重复上次提交按钮。");
            }
        }
            
        
    }
    //* II.3. 改写提交按钮的逻辑，把提交内容存入Storage，并post到其他hosts的相同pathname下 -----------------
    //* 提交按钮按下时先在 Storage 存下 frmMain(/wsxk/stu_btx.aspx) -> frmRpt(/wsxk/stu_btx_rpt.aspx) -> id=oTable 的innerHTML。点击重复提交时先从storage里调取覆盖，再执行提交按钮对应的onclick。
    if (Append_Resubmit_Button && name == 'frmRpt'){
        // 通识 frmRpt(/wsxk/stu_xszx_rpt.aspx)
        // 英语 frmRpt(/wsxk/stu_btx_rpt.aspx)
        // 非限 frmRpt(/wsxk/stu_btx_rpt.aspx)
        
        var tpe = null; // 选择修改的内容是scripts几
        if (this.location.pathname == "/wsxk/stu_btx_rpt.aspx"){
            tpe = 1;
        }else if(this.location.pathname == "/wsxk/stu_xszx_rpt.aspx") {
            tpe = 3;
        }
        if (tpe){   
            //* 只在加载出表格网页时才进行
            for (const btn of parent.document.querySelectorAll(".button")) {
                if (btn.value == "提交"){
                    subBtn = btn;
                    log("获取提交按钮");
                    break;
                }
            }
            
            if (subBtn != null) {
                //* 改变提交按钮的逻辑，先存oTable再onclick
                
                //* frmRpt(/wsxk/stu_btx_rpt.aspx 对应scripts[1]) (/wsxk/stu_xszx_rpt.aspx 对应scripts[3]) 里的 checkbox 'chkKC' 的checked属性以及后面input 'chkSKBJstr' 的value属性 与 HTML标签里的属性不同步，
                //* 可以单独记录所有chkKC的checked和chkSKBJstr的value，读取的时候也把这些信息读进来。√
                //* 或修改网页的函数openWinDialog, 使得改变chkKC的属性值以及chkSKBJstr的value使修改对应的HTML标签。×
                
                // var oTable = null;
                if (name == 'frmRpt') {
                    oTable = document.getElementById("oTable");
                }else if (name == 'frmMain') {
                    oTable = frmRpt.document.getElementById("oTable");
                }

                const leixing = parent.document.querySelector("."+BTN_CLASS).getAttribute("leixing");


                // debugger;
                subBtn.onclick = function(oTable, leixing){
                    return function(){

                        GM_setValue(Last_Submit_Table_Storage_Key[leixing], oTable.innerHTML);
    
                        //* 存所有checkbox (chkKC#)的checked属性和后面的input (chkSKBJstr#)的value属性到JSON
                        const chkKCs = oTable.querySelectorAll("input[type='checkbox']");
                        var tmp = {}; // 要存储的JSON：chkKC1: true, ...
                        for (const chkKCi of chkKCs) {
                            tmp[chkKCi.id] = chkKCi.checked;
                        }
                        const chkSKBJstrs = oTable.querySelectorAll("input[type='text']");
                        for (const chkSKBJstr of chkSKBJstrs) {
                            tmp[chkSKBJstr.id] = chkSKBJstr.value;
                        }
    
                        GM_setValue(Last_Submit_DOM_Storage_Key[leixing], 
                            JSON.stringify(tmp));
                        log("成功保存" + leixing + "_信息");

                        self.document.all.Submit.onclick();
                    };

                } (oTable, leixing);

            }
        }
    }
    //* --------------------------------------------------------------

    //* III. 弹出窗口增加快速选择选项（选好后自动确定） --------------------------
    if (Append_Fast_Choose_Button && (location.pathname == "/wsxk/stu_xszx_skbj.aspx" || location.pathname == "/wsxk/stu_xszx_chooseskbj.aspx")){
        //* 专业课: /wsxk/stu_xszx_skbj.aspx?xxxx=xxxx
        //* 英语: /wsxk/stu_xszx_chooseskbj.aspx?xxx
        //* 非限: /wsxk/stu_xszx_skbj.aspx?xxx
        //* 通识: /wsxk/stu_xszx_skbj.aspx?xxx
        var tab = document.getElementById("pageRpt");
        var sureBtn = document.getElementById("sure"); // 确定按钮

        //* III.1. 最后新加一列
        // 列头
        var tdh = tab.querySelector(".T").insertCell();
        tdh.rowSpan = "2";
        tdh.textContent = "快选";
        tdh.align = "center";
        
        //* III.2. 每一行结尾添加快选按钮
        var trs = tab.querySelectorAll(".B");
        for (const tr of trs) {
            if (tr.lastElementChild.firstElementChild.tagName.toUpperCase() == "INPUT") {
                var rad = tr.lastElementChild.firstElementChild;
                // 含radio的那一行，插入快选按钮
                
                var inp = document.createElement("input");
                inp.className = "button";
                inp.type = "button";
                inp.value = "快选";
                inp.style.marginTop = "2px";
                inp.style.marginBottom = "2px";
                inp.disabled = rad.disabled; // 快选的按钮disabled与前面的radio相同
                
                // 每行最后一个格子
                var td = tr.insertCell();
                td.rowSpan = rad.parentElement.rowSpan;
                td.appendChild(inp);

                //* III.3.添加按钮的逻辑
                // 按下时先选中前面的rad，再点击确定按钮

                // 接受参数，返回由参数确定内容的函数指针。
                inp.onclick = function(rad, sureBtn){
                    return function(){
                        // 按下时先选中前面的rad，再点击确定按钮

                        rad.onclick(); // 选中前面的rad
                        sureBtn.onclick(); // 点击确定

                        log("快速选择了" + rad.id);
                    }
                }(rad, sureBtn);
                
            }
        }
        log("添加了快选按钮");

    }
    //* --------------------------------------------------------------
    
})();

window.onload = function(){
    //* IV. 自动点击检索按钮
    //* class为button, value为检索
    if (Auto_Click_Search && name == 'frmMain'){
        var leixing = null; // 是哪个类型的页面：xk, ts, yy, fx
        switch (this.location.pathname) {
            case "/wsxk/stu_btx.aspx": // 专业课
                leixing = "xk";
                break;
            case "/wsxk/stu_whszk.aspx": // 英语
                leixing = "ts";
                break;
            case "/wsxk/stu_yytgk_bx.aspx": // 通识
                leixing = "yy";
                break;
            case "/wsxk/stu_ggrxk.aspx": // 非限
                leixing = "fx";
                break;
            default:
                break;
        }
        if (leixing) {
            var searchBtn = null;
            for (const btn of document.querySelectorAll(".button")) {
                if (btn.value == "检索"){
                    searchBtn = btn;
                    log("已获取检索按钮");
                    break;
                }
            }
            if (searchBtn){
                searchBtn.click(); // 模拟点击按钮
                log("已点击检索按钮");
            }else{
                error("未找到检索按钮");
            }
        }
    }
    //* --------------------------------------------------------------
};

function insertBefore(newElem, targetElem) {
    var parent = targetElem.parentNode;
    parent.insertBefore(newElem, targetElem);
    
}

function insertAfter(newElem, targetElem){

    var parent = targetElem.parentNode;
    if (parent.lastChild == targetElem) {
        // 如果最后的节点是目标元素，则直接添加。因为默认是最后
        parent.appendChild(newElem);
    } else {
        //如果不是，则插入在目标元素的下一个兄弟节点 的前面。也就是目标元素的后面
        parent.insertBefore(newElem, targetElem.nextSibling);
    }
}
