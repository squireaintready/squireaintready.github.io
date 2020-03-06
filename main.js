$(document).ready(function () {

    //refresh page
    /*$('.refresh').on('click', function(){
        document.reload();
    });*/

    //hides elements shows next element
    //hides elements when confirming selection
    $('.fwdBtn').on('click', function () {
        $( "#mypanel" ).trigger( "updatelayout" );
        this.style.backgroundColor = 'LightSteelBlue';
        var btnId = $(this).attr('tog-lerID');
        $("#" + btnId).slideToggle(300);
        $("#" + btnId).next().slideToggle(300);
        if (btnId == 'defaults') {
            setEmployeeCount(this.id);
        } else if (btnId == 'enterManually') {
            setEmployeeCount(this.id);
        } else if (btnId == 'cashV') {
            calculateTips();
            //$('#enterManually').slideToggle(300);
            //$('#' + btnId).slideToggle(300);
        } 
    });

    //hides current element shows previous element
    $('.backBtn').on('click', function(){
        $( "#mypanel" ).trigger( "updatelayout" );
        var backBtnId = $(this).attr('tog-lerID');
        this.style.backgroundColor = 'Blue';
        console.log(backBtnId);
        $('#' + backBtnId).slideToggle(300);
        $("#" + backBtnId).next().slideToggle(300);
    });


    //initialize variables
    function setEmployeeCount(helper) {
        if (helper == 'weekday') {
            $('#numBG').val(1);
            $('#numBB').val(3);
            $('#numServer').val(7);
        } else if (helper == 'weekend') {
            console.log(helper);
            $('#numBG').val(1);
            $('#numBB').val(3.65);
            $('#numServer').val(10);
        } else if (helper == 'manual')
            //if($('#manualSelectorBtn').is('click', function(){
            $('#numBG').value;
        $('#numBB').value;
        $('#numServer').value;
        //}))
    };

    function calculateTips() {
        //calculates and displays bg tip
        if ($('totalCash'.value) < 0) {
            alert('There is no cash silly.');
        } else {
            if (numBG.value == 1) {
                var bgHelper = totalCash.value * .015;
                bg.value = bgHelper;
            } else if (numBG.value == 2) {
                let bgL = Math.round((totalCash.value * .015) * .4);
                let bgD = Math.round((totalCash.value * .015) * .6);
                var bgHelper = bgL + bgD + 0;
                bg.value = "Lunch: " + bgL + "  Dinner: " + bgD;
            } else {
                alert('Error: bus-girls. Can not compute')
            };

            //calculates bb tip
            if (numBB.value == 3) {
                bb.value = Math.round((((((totalCash.value - bgHelper) /
                    numServer.value) * .25) * 2.5) / numBB.value));
                var bbHelper = (numBB.value * bb.value);
            } else if (numBB.value == 3.65) {
                let bgAD = Math.round((((((totalCash.value - bgHelper) /
                    numServer.value) * .25) * 3) / numBB.value));
                let bgD = Math.round((bgAD * .65));
                var bbHelper = (bgAD * 3) + bgD + 0;
                bb.value = "Dinner only: " + bgD + "  All Day: " + bgAD;
            } else {
                alert('Error: bus-boys. Can not compute');
            };
            //calculates servers        
            if ((numServer.value % 1) == 0) {
                serv.value = Math.floor(((totalCash.value - bgHelper - bbHelper) /
                    numServer.value));
                var servHelper = (serv.value * numServer.value);
            } else if ((numServer.value % 1) != 0) {
                let senior = Math.floor(((totalCash.value - bgHelper - bbHelper) /
                    numServer.value));
                let trainnee = Math.floor(senior * (numServer.value % 1));
                servHelper = senior + trainee + 0;
                serv.value = servHelper;
                servHelper = (servHelper * numServer * 1);
            } else {
                alert('Error: Servers. Can not compute');
            };
            //display totalBB
            totalBB.value = bbHelper;
            //display total bussers
            totalBusser.value = bgHelper + bbHelper + 0;

            //calculates remaining cash after distribution
            remainder.value = totalCash.value - totalBusser.value - servHelper;
        }
    }


    
});

 
