window.onload = () => {
    new Uav()
}
class Uav{
    constructor() {
        this.planeArray = []
        this.number;
        this.addListener();
    }
    addListener(){
        document.getElementById("showFile").addEventListener("click",this.showFile.bind(this))
        document.getElementById("showContent").addEventListener("click",this.showContent.bind(this))
        document.getElementById("search").addEventListener("click",this.search.bind(this))
    }
    /* 
    显示方式一：选择文件
    */
    showFile() {
        document.getElementsByClassName("UAV-file")[0].style.display = "block";
        document.getElementsByClassName("UAV-content")[0].style.display = "none";
    }

    /* 
    显示方式二：直接输入内容
     */
    showContent() {
        document.getElementsByClassName("UAV-file")[0].style.display = "none";
        document.getElementsByClassName("UAV-content")[0].style.display = "block";
    }

    /*
    查询
     */
    search() {
        this.number = document.getElementsByClassName("UAV-id")[0].value; // number查询的序号
            if(document.getElementsByClassName("UAV-file")[0].style.display == "block"){ // 方式一：选择文件
                if(this.isInteger(Number(this.number))){ //number是不是整数
                    if(this.number<0){ // 小于0找不到
                        document.getElementById("UAV-result").innerHTML = "Cannot find " + this.number;
                }else{ // 否则才读取这个文件
                    this.readFile();
                }

            }else{
                document.getElementById("UAV-result").innerHTML = "序号格式错误，请输入整数";
            }
        }
        if(document.getElementsByClassName("UAV-content")[0].style.display == "block"){ // 方式二：手动输入内容
            this.planeArray = this.handleArray(document.getElementsByClassName("UAV-content")[0].value.split("\n"));
            this.print();
        }
    }

    /*
    读取文件
    */
    readFile() {
        var uavFile = document.getElementsByClassName("UAV-file")[0].files[0]; // 获取这个file
        this.planeArray = [];
        if(!/(\.txt)$/.test(uavFile.name)){ // 文件后缀不是txt
            alert("请上传txt文件");
            return false;
        }else{
            if (window.FileReader) { // 你的浏览器支不支持filereader，一般都是支持的，这个提供的API可以对文件进行一些操作
                var fileReader = new FileReader();
                var _this = this
                fileReader.onload = function() {
                    
                    _this.planeArray = _this.handleArray(this.result.split("\n")); // 处理字符串，这里的参数就是把这堆东西以回车键分隔成一个数组，现在所有的数据都在一个数组里
                    _this.print();
                }
                fileReader.readAsText(uavFile); // 将文件视为文本读取
            }else{
                document.getElementById("UAV-result").innerHTML = "您的浏览器不支持FileReader，请尝试直接输入";
            }
        }
    }

    /*
    处理输入，初始化数组
    */
    handleArray(arr){ // arr就是以回车分隔后的数组（在上面传的是自己输的或者就是读取的文件）
        var temp;
        for(var last = arr.length-1;last>=0;last--){
            if(arr[last] !=""){
                break;
            }
        }
        arr.length = last+1;
        for(var index = 0;index<arr.length;index++){
            var plane = arr[index].replace(/(\s*$)/g, ""); // 一个plane其实就是一行数据
            temp = plane.split(/\s+/); // 临时变量存plane的信息 空格切割得到一个数组
            plane = {};
            plane.uavId = temp[0]; // 无人机ID
            plane.uavX = Number(temp[1]); // uavX 无人机X轴当前坐标或前一条消息的坐标
            plane.uavY = Number(temp[2]);
            plane.uavZ = Number(temp[3]);
            plane.offsetX = typeof temp[4] == "undefined"? undefined:Number(temp[4]); // 判断有没有偏移量
            plane.offsetY = typeof temp[5] == "undefined"? undefined:Number(temp[5]);
            plane.offsetZ = typeof temp[6] == "undefined"? undefined:Number(temp[6]);
            plane.isFault = true; // 每个plane的isFault都是true，isFault用来判断是否故障
            plane.curX = "NA"; // curX 无人机X方向偏移后的当前坐标 故障状态下为NA
            plane.curY = "NA";
            plane.curZ = "NA";
            plane.other = temp[7]||undefined;
            arr.splice(index,1,plane);
        }
        return this.judge(arr);
    }

    /*
    判断故障
    */
    judge(arr){ // 飞机的位置信息的集合，数组形式
        var uavId;
        for(var index = 0;index < arr.length; index++) {
            var plane = arr[index];

            if(index==0){ // 第一条，只用判断刚进入时的信息
                //判断id是不是由字母和数字组成
                if(/^[A-Za-z0-9]+$/.test(plane.uavId)){
                    //x y z为整数
                    if(this.isInteger(plane.uavX)&&this.isInteger(plane.uavY)&&this.isInteger(plane.uavZ)){
                        //第一行没有offset
                        if((typeof plane.offsetX =="undefined") && (typeof plane.offsetY =="undefined") && (typeof plane.offsetZ =="undefined")&& (typeof plane.other == "undefined")){ // 所有条件都通过了（id，整数，没有偏移量），进行下一步
                            uavId = plane.uavId; // id赋值
                            plane.isFault = false; // 是否故障
                            plane.curX = plane.uavX; // 初始位置赋值，cur是现在准确的坐标（不会有错，它错了只能说明飞机已经故障了），uav是数据上的（随时可能错）
                            plane.curY = plane.uavY;
                            plane.curZ = plane.uavZ;
                            arr.splice(index,1,plane); // 删除当前下标对应的一项并加入plane（对象）
                        }
                    }
                }

            }else{ // index != 0的情况，都会有偏移
                //一旦前一个故障，后续都为故障
                if(arr[index-1].isFault){
                    break;
                }
                //每个文本仅记录一辆无人机
                if(plane.uavId ==uavId){
                    //x y z与前一条消息的坐标相等
                    if(arr[index-1].curX == plane.uavX && arr[index-1].curY ==plane.uavY && arr[index-1].curZ ==plane.uavZ){ // 如果数据上的坐标跟实际的还对得上，说明还没故障，对不上就故障了
                        // offset为整数，三个offset后面没有多余信息
                        if(this.isInteger(plane.offsetX) && this.isInteger(plane.offsetY ) && this.isInteger(plane.offsetZ) && typeof plane.other == "undefined"){
                            plane.curX = plane.uavX + plane.offsetX;
                            plane.curY = plane.uavY + plane.offsetY;
                            plane.curZ = plane.uavZ + plane.offsetZ;
                            plane.isFault = false;
                            arr.splice(index,1,plane); // 删除当前下标对应的一项并加入plane（对象）
                        }
                    }
                }
            }

        }
        return arr;
    }

    /*
    判断整数
     */
    isInteger(arr) {
        return typeof arr === 'number' && arr%1 === 0
    }

    /* 
    打印到页面 
    */
    print() {
        if(this.number>=this.planeArray.length || this.number<0)  {
            document.getElementById("UAV-result").innerHTML = "Cannot find "+this.number;
        }else if(this.planeArray[this.number].isFault){
            document.getElementById("UAV-result").innerHTML = "Error: "+this.number;
        }else {
            document.getElementById("UAV-result").innerHTML = this.planeArray[this.number].uavId + " " + this.number + " " + this.planeArray[this.number].curX + " " + this.planeArray[this.number].curY + " " + this.planeArray[this.number].curZ;
        }
    }
}