var DRAW_TIME = 3000; //3s 画完
var SEGS = 10; //数据分十段
var poiArray = []; //用于记录页面中的点状态
var poi_num=[];
var colorIndex = 0;
var pois_div='';
var pois_div_start_len=0;
var pois_div_end_len=0;
var colorInfo = [{
    color: '#2925cd',
    imgUrl: './images/marker1.png',
    idle: true
}, {
    color: '#de1c1c',
    imgUrl: './images/marker2.png',
    idle: true
}, {
    color: '#11baab',
    imgUrl: './images/marker3.png',
    idle: true
}, {
    color: '#8518bd',
    imgUrl: './images/marker4.png',
    idle: true
}, {
    color: '#169d0d',
    imgUrl: './images/marker5.png',
    idle: true
}];
var cityInfo = {
    '110000': {
        location: {
            lat: 39.90469,
            lng: 116.40717
        },
        name: '北京市'
    },
    '310000': {
        location: {
            lat: 31.23037,
            lng: 121.4737
        },
        name: '上海市'
    },
    '440100': {
        location: {
            lat: 23.12908,
            lng: 113.26436
        },
        name: '广州市'
    },
    '440300': {
        location: {
            lat: 22.54286,
            lng: 114.05956
        },
        name: '深圳市'
    }
}
define(function(require, exports, module) {
    function Index() {
        var self = this;
        self.init();
    };

    Index.prototype.init = function() {
        var self = this;
        self.mapContainer = $('#container');
        self.searchForm = $('#formSearch');
        self.categoryList = $('#categoryList');
        self.categoryList_tuli = $('#categoryList_tuli');
        self.categoryUL = $('#categoryList ul');
        self.categoryUL_tuli = $('#categoryList_tuli ul');
        self.load = $('#loadTip');
        self.categoryType = 0; //筛选条件中，默认选择POI分类
        self.searchKey = ''; //默认检索的key为空
        self.searchKey_all='';
        self.initMap();
        self.suofangMap();
        self.categoryNum = 0;
        self.bindEvents();
    };

    Index.prototype.bindEvents = function() {
        var self = this;
        $('#mode').change(function() {
            var modeId = $(this).children('option:selected').val();
            self.categoryType = modeId;
            console.log(self.categoryType);
            $('.category').removeClass('active');
            $('#mode_' + modeId).addClass('active');

        });

        self.searchForm.on('submit', function(e) { //点击搜索按钮发起检索
            e.preventDefault();

            var citycode = $('[name=city]').val();
            var cityname = cityInfo[citycode].name.slice(0,-1);
            var center = new qq.maps.LatLng(cityInfo[citycode].location.lat, cityInfo[citycode].location.lng)
            self.map.panTo(center);

            var isInList = false, //用来检测是否已经在UL条目中
                LIS = self.categoryUL.children();
            var categoryName = $('.category.active span').html();//美食-烧烤
            var categoryRel = $('.category.active span').attr('data-rel');//160000
            if (categoryRel) {
                if (self.categoryNum >= 5) {
                    alert('最多可进行5次筛选哦');
                    return;
                }
                var cate = '',
                    tag = '';
                if (self.categoryType == 0) { //poi分类
                    cate = categoryRel;
                } else { //关键字检索    
                    if(categoryName=='美食-川菜'||categoryName=='美食-粤菜'||categoryName=='美食-东北菜'||categoryName=='美食-湘菜'||categoryName=='美食-西北菜'||categoryName=='美食-台湾菜'||categoryName=='美食-云贵菜'||categoryName=='美食-新疆菜'){//其中江西菜做了特殊的处理 放在了tag里面 因没有独特的分类码
                      cate=categoryRel;
                    }else{
                      tag = categoryName.split('-')[1] + '_' + categoryRel;
                    }
                }

                self.searchKey = cate + ':' + tag;
                self.searchKey_all=cityname+'_'+self.searchKey;

                console.log('检索的key'+self.searchKey)
                for (var i = 0; i < LIS.length; i++) {
                    if ($(LIS[i]).attr('data-key') == self.searchKey_all) {
                        isInList = true;
                        break;
                    }
                }
                if (!isInList) {
                    self.showTips(categoryName, self.searchKey_all , cityname);
                    self.loadData(cate, tag, self.searchKey,self.searchKey_all); //向后台请求数据
                    self.categoryNum++;
                    colorIndex++;
                }
                var tiaojian=$('#mode').val();
                if(tiaojian==1){
                    $('.category.active span').attr('data-rel','');
                    $('.category.active span').html('请选择关键字');
                }else{
                    $('.category.active span').attr('data-rel','');
                    $('.category.active span').html('请选择POI分类');
                }
            }

        });

        $(".close").live('click', function(e) {
            console.log(poi_num)
            console.log(poiArray)
            var click_num=$(this).parent().index()-1;//01234
            var key = $(this).parent().attr('data-key');

            console.log(key)
            console.log(poiArray)
            if (key && poiArray[key]) {
                if(poi_num[click_num]&&poi_num[click_num]!=undefined||poi_num[click_num]==0){
                    // alert('太棒了 可以删除了')
                    /*if (key && poiArray[key] && poiArray[key].length > 0　) {
                          for (var i = 0; i < poiArray[key].length; i++) {
                              poiArray[key][i].setMap(null);
                          }
                    }*/
                    //self.cleanPoi(click_num,poiArray[key]);对应的是清楚div的cleanpoi
                    self.cleanPoi(poiArray[key]);
                    $(this).parent().remove();
                    self.categoryUL_tuli.find('li[data-key="'+key+'"]').remove();
                    delete(poiArray[key]);
                    self.categoryNum--;
                    if (!self.categoryNum) {
                        self.categoryList.hide(800);
                        self.categoryList_tuli.hide(800);
                    }
                }else{
                    alert('请稍等...地图在绘画此条目过程中不可删除哦！')
                }
                
               
            }
        });
    };
    Index.prototype.cleanPoi = function(pois,segIndex) {
        var self = this;
        var len=pois.length;
        var SEGS_2;
        if(len<5000){
           SEGS_2=10;
        }else if(len>=5000&&len<10000){
           SEGS_2=20;
        }else if(len>=10000&&len<15000){
           SEGS_2=40;
        }else if(len>=15000&&len<20000){
           SEGS_2=60;
        }else if(len>=25000&&len<30000){
           SEGS_2=100;
        }else if(len>=30000&&len<35000){
           SEGS_2=150;
        }
        else if(len>=35000&&len<40000){
           SEGS_2=200;
        }
        else if(len>=45000&&len<50000){
           SEGS_2=250;
        }else{
           SEGS_2=300;
        }
        
        var segIndex = segIndex || 0;
        if (segIndex >= SEGS_2) {
            return;
        }
        console.log('cleanPoi', segIndex);
        var segNum = Math.ceil(len/ SEGS_2);
        console.log(segNum)

        var i = segNum * segIndex;
        var j = segNum * (segIndex + 1);
        var arr=pois.slice(i,j);
        arr.forEach(function(we) {
            we.setMap(null);
        });

        setTimeout(function() {
            self.cleanPoi(pois, segIndex + 1);
        }, DRAW_TIME / 20);
    };
    //这个是清楚div的 但是还存在如果清除了 缩放地图 会重新生成marker
    /*Index.prototype.cleanPoi = function(num,arr) {//arr===poiArray[key]
        var self = this;
        num=Number(num);
        //var len=pois.length;
        var beforeNum=0;//删除的开始位置前面的div有多少个
        for(var i=0;i<num;i++){
           beforeNum+=Number(poi_num[i]);
        }
        var targetNum=Number(poi_num[num])+beforeNum;//需要删除的当前截止位置
        
        $('#container div').each(function(){
            if($(this).css('z-index')=='106'){
                console.log('找到了106')
                console.log('106里面的div个数：'+$(this).children('div').length)
               var divs=$(this).find('div');
               if(poi_num.length==1){
                  $(this).html('');
                  /*arr.forEach(function(we) {
                      we.setMap(null);
                  });
                  console.log('106里面的div个数：'+$(this).children('div').length)
               }else{
                 console.log('删除开始位置'+beforeNum)
                 console.log('删除结束位置'+targetNum)
                 for(var j=beforeNum;j<targetNum;j++){
                    if(divs.eq(j)){
                        divs.eq(j).remove();
                    }
                 }
               }
               pois_div=''+$(this).html();
              poi_num.splice(num,1);
            }
        })

    };
*/
    Index.prototype.initMap = function() {
        var self = this;
        var center = new qq.maps.LatLng(39.90469, 116.40717);
        var opts = {
            zoomControl: false,
            mapTypeControl: false,
            zoom: 12,
            center: center
        };
        self.map = new qq.maps.Map(document.getElementById('container'), opts);
        
    };
    Index.prototype.suofangMap = function() {
        var self = this;
        /*self.map.zoom_changed=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }*/
        /*self.map.drag=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.center_changed=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }*/
        /*self.map.bounds_changed=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.resize=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.tilesloaded=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.idle=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.maptypeid_changed=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.mouseover=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.mousemove=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.mouseout=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.click=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.dblclick=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.dragstart=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.dragend=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.projection_changed=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }
        self.map.rightclick=function(){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  $(this).html(pois_div);
               }
             });
        }*/
    };

    Index.prototype.initXmenu = function() {
        $("#mode_0").xMenu({
            width: 750,
            eventType: "click", //事件类型 支持focus click hover
            dropmenu: "#m1", //弹出层
            hiddenID: "selectposhidden" //隐藏域ID   

        });
        $("#mode_0").xMenu({
            width: 750,
            eventType: "click", //事件类型 支持focus click hover
            dropmenu: "#m2", //弹出层
            hiddenID: "selectposhidden" //隐藏域ID   

        });
    };

    Index.prototype.showTips = function(val, key_all , cityname) {
        var self = this;
        var color = colorInfo[colorIndex % 5].color;
        var html = '<li data-key="' + key_all + '"><span class="name">(' +cityname+')'+ val + '</span><span class="color" style="background:' + color + '"></span><i class="close"></i>';
        $(html).appendTo(self.categoryUL);
        var html_tuli= '<li data-key="' + key_all + '"><span class="color" style="background:' + color + '"></span><span class="key_val"></span>';
        $(html_tuli).appendTo(self.categoryUL_tuli);
        if (!self.categoryNum) { //初始时条目为0,先展示
            self.categoryList.show(800);
            self.categoryList_tuli.show(800);
        }
    };
    Index.prototype.showTips_tuli = function(key,poi_arr) {
        var self = this;
        var len=poi_arr.length;
        self.categoryUL_tuli.find('li[data-key="'+key+'"] span.key_val').html(len);
    };

    Index.prototype.getRandomColor = function() {
        return '#' + ('00000' + (Math.random() * 0x1000000 << 0).toString(16)).substr(-6);
    };

    Index.prototype.loadData = function(cate, tag, key , key_all) {//key_all包括城市名称和key
        var self = this;
        var citycode = $('[name=city]').val();
        if (!poiArray[self.searchKey_all]) {
            console.log('该检索条件下暂无数据,需要load')
            poiArray[self.searchKey_all] = [];
            var anchor = new qq.maps.Point(13, 8),
                size = new qq.maps.Size(13, 19),
                origin = new qq.maps.Point(0, 0),
                scaleSize = new qq.maps.Size(13, 19),
                icon = new qq.maps.MarkerImage(
                    colorInfo[colorIndex % 5].imgUrl,
                    size,
                    origin,
                    anchor,
                    scaleSize
                );
            //self.drawPoi(testData['poi_list'], icon); //先用一批测试数据
        }
        self.load.show();
        $.ajax({
            url: 'http://10.173.142.164:8080/aurora/aurora_get_all.php?output=jsonp&citycode=' + citycode + '&cate=' + cate + '&tag=' + encodeURI(encodeURI(tag)),
            dataType: 'jsonp',
            jsonp: 'cb',
            jsonpCallback: 'aurora',
            success: function(resp) {
                self.load.hide();
                self.drawPoi(resp['poi_list'], icon);
                self.showTips_tuli(key_all,resp['poi_list']);
                console.log('返回的点数据', resp);
            },
            error: function(resp) {
                alert('服务器开小差了,请 @goosegu@ ');
            }
        });
    };
    Index.prototype.drawPoi = function(pois, icon, segIndex) {
        var self = this;
        var segIndex = segIndex || 0;
        var num_ =0;
        if(segIndex==0){
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                  pois_div_start_len=$(this).children('div').length;
               }
             });
        }
        if (segIndex >= SEGS) {
            $('#container div').each(function(){
               if($(this).css('z-index')=='106'){
                console.log('画完了div有多少个'+$(this).children('div').length)
                pois_div_end_len=$(this).children('div').length;
                num_=pois_div_end_len-pois_div_start_len;
                poi_num.push(num_);
                pois_div=$(this).html();
               }
             });
            return;
        }
        console.log('drawPoi', segIndex);

        var list, path;
        var segNum = Math.ceil(pois.length / SEGS);
        console.log(segNum)
        var i = segNum * segIndex;
        var j = segNum * (segIndex + 1);
        //console.log('poiArray数组'+poiArray[self.searchKey_all])
        while (i < j && i < pois.length - 1) {
            poiArray[self.searchKey_all].push(new qq.maps.Marker({
                position: new qq.maps.LatLng(pois[i]['point_y'], pois[i]['point_x']),
                icon: icon,
                map: self.map
            }));
            i++;
        }
        setTimeout(function() {
            self.drawPoi(pois, icon, segIndex + 1);
        }, DRAW_TIME / SEGS);
    };

    return Index;
});
