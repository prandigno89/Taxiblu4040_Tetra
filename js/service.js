var urlHub = {
	'prenotazione': 'https://ims.ingenico.it/IngenicoTaxi4040/TaxiCall',
    'complessa': 'https://ims.ingenico.it/IngenicoTaxi4040/TaxiCallComplex',
    'annulla': 'https://ims.ingenico.it/IngenicoTaxi4040/Annulla',
	'meteo': 'https://ims.ingenico.it/IngenicoTaxi4040/TestMeteo'
	};

/*
    Test http call:
    'prenotazione': 'https://ims.ingenico.it/IngenicoTaxi4040/TestJson',
	'complessa': 'https://ims.ingenico.it/IngenicoTaxi4040/TestComplessa',
	'annulla': 'https://ims.ingenico.it/IngenicoTaxi4040/TestAnnulla',
	'meteo': 'https://ims.ingenico.it/IngenicoTaxi4040/TestMeteo'
*/

/*
Produzione
	'prenotazione': 'https://ims.ingenico.it/IngenicoTaxi4040/TaxiCall',
    'complessa': 'https://ims.ingenico.it/IngenicoTaxi4040/TaxiCallComplex',
    'annulla': 'https://ims.ingenico.it/IngenicoTaxi4040/Annulla',
	'meteo': 'https://ims.ingenico.it/IngenicoTaxi4040/TestMeteo'


*/


var risultato;
var message;
var sigla;
var attesa;
var idcorsa;
var serial_number;


$(
	
	function(){	
		
		//Servizio Tetrajs per raccolta seriale del terminale:
		var info = tetra.service({"service": 'local.desktopenv.settings', "namespace": 'ingenico.desktopenv'});
		info.connect();
		info.call("Information").success(function(r) { 
			//console.log("serial number: " + r.terminal.serialNumber);
			serial_number = r.terminal.serialNumber; 
			console.log("VARIABILE SERIALE: " + serial_number);
			$('#serial').html(serial_number);
													});
       
       var stato = tetra.setup().success(function(callb){console.log(callb)});
       console.log(stato);                                      
                                                    
        //Servizio TetraJS per setting del timeout 
        var callTimer = tetra.setup({data:{gatewayTimeout:480}}).success(); // Set gateway timeout to 120 seconds
        stato = tetra.setup().success(function(callb){console.log(callb)});
        console.log(stato);                                                
			
							
		//inizializzo gli elementi come invisibili tranne la pagina 1:
		$('#page2').hide();
		$('#page3').hide();
		$('#page4').hide();
		$('#page5').hide();
		$('#page6').hide();
		$('#page7').hide();
		$('#page8').hide();
		
		//variabili per spostamenti in app (per routing).
		var a1 = $('#a1');
		var a2 = $('#a2');
		var a3 = $('#a3');
		var a4 = $('#a4');
		var b1 = $('#back1');
		var b2 = $('#back2');
		var b3 = $('#back3');
		var b4 = $('#back4');
		var b5 = $('#back5');
		
		var p1 = $('#prapida1');
		var p2 = $('#prapida2');
		var p3 = $('#annullo');
					
		
		//ROUTER DI VISUALIZZAZIONE PAGINE:
		a1.on('click', function(){ visualizza('#page1','#page2'); });
		a2.on('click', function(){ visualizza('#page1','#page3'); });
		a3.on('click', function(){ visualizza('#page1','#page8'); });
		a4.on('click', function(){ visualizza('#page1','#page7'); });
		
		b1.on('click', function(){ visualizza('#page2','#page1'); });
		b2.on('click', function(){ visualizza('#page3','#page1'); });
		b3.on('click', function(){ visualizza('#page6','#page1'); });
		b4.on('click', function(){ visualizza('#page7','#page1'); });
		b5.on('click', function(){ visualizza('#page8','#page1'); });
		
		
		//funzione Prenotazione rapida di un taxi
		p1.on('click', function(){ 
		resetCampi();
		visualizza('#page2','#page4');
		chiamaMeteo();
		chiamaTaxi('#page4');	
		});
		//funzione prenotazione complessa di un taxi con opzioni
		p2.on('click', function(){
			resetCampi();
			//se ho selezionato almeno un opzione chiamo il taxi option
            var opzioni= $('#options').serializeArray();
			var toSend="";
            for(var i=0; i < opzioni.length; i++){
                //console.log(opzioni[i].name);
                if(opzioni[i].value="on"){
                    if(i>1){
                    toSend+= "%"+opzioni[i].name;
                    
                    }
                    else{
                        toSend+=opzioni[i].name;
                    }
                }
               
            }
            if(toSend!=""){
            chiamaMeteo();  
			visualizza('#page3','#page4');
			//alert("Selezionati:"+opzioni);
			chiamaTaxiOption('#page4',toSend);
			}else{
				
                alert("Nessuna opzione selezionata");
				visualizza('#page4','#page3');
			}	
		});
		p3.on('click', function(){
            resetCampi();
			visualizza('#page8','#page4');
			annullaUltimoTaxi('#page4',idcorsa);	
		});
	
		
		
				
	}
		
)

// Funzione per il cambio di visualizzazione della pagina:
function visualizza(p1,p2){
		
		//console.log(p1);
		//console.log(p2);
				
		$(p1).hide();
		$(p2).show();
		
		
	};

// Funzione per la prenotazione di un taxi:	
function chiamaTaxi(pagina){
	
	$.ajax({
			type:'GET',
			url:urlHub.prenotazione,
			data:{termid : serial_number},
			datatype:'json',
			timeout:50000,
			context:$('body'),
			success:function(data){
			//vado alla pagina riassunto
			visualizza(pagina,'#page6');
			//interpreto il json
			risultato= data.result;
            
            if(risultato==true){
            sigla= data.sigla;
			attesa = data.attesa;
			idcorsa=data.idcorsa;
			//inserisco i dati nel html		
		    $('#sigla').html("TAXI NAME: "+ sigla);
			$('#attesa').html("WAITING TIME: " + attesa + " min.");
			$('#idcorsa').html("RACING ID: " + idcorsa);
            }
            else{
            $('#message').html(data.message);    
            }
			window.print();
			},
			error:function(xhr, type){
				alert("OPS! Non riesco a comunicare con il server di prenotazione..");
				//window.print();
				visualizza('#page4','#page1');
			}
		});
};

// Funzione per la chiamata complessa di un taxi
function chiamaTaxiOption(pagina, opzioni){
	
	$.ajax({
			type:'GET',
			url:urlHub.complessa,
			data: {termid : serial_number, options:opzioni},
			datatype:'json',
			timeout:50000,
			context:$('body'),
			success:function(data){
			//vado alla pagina riassunto
			visualizza(pagina,'#page6');
			//interpreto il json
            risultato= data.result;
            if(risultato==true){
			sigla= data.sigla;
			attesa = data.attesa;
			idcorsa=data.idcorsa;
			//inserisco i dati nel html		
			$('#sigla').html("TAXI: "+ sigla);
			$('#attesa').html("ATTESA: " + attesa);
			$('#idcorsa').html("CORSA NUM. " + idcorsa);
            }
            else{
            $('#message').html(data.message);    
            }
            // $('#endmessage').html("Grazie e Arrivederci.<br/>Buone feste da Ingenico!");
			//stampo lo scontrino
			window.print();
			},
			error:function(xhr, type){
				alert("OPS! Non riesco a comunicare con il server di prenotazione..");
				visualizza('#page4','#page1');
			}
		});
};

// Funzione per l'annullamento ultima prenotazione:	
function annullaUltimoTaxi(pagina, corsa){
	
	$.ajax({
			type:'GET',
			url:urlHub.annulla,
			data:{termid : serial_number, idcorsa : corsa},
			datatype:'json',
			timeout:50000,
			context:$('body'),
			success:function(data){
			//vado alla pagina riassunto
			visualizza(pagina,'#page6');
			//interpreto il json
			$('#message').html(data.message);
			$('#idcorsa').html("CORSA NUM. " + idcorsa);
			window.print();
			
			},
			error:function(xhr, type){
				alert("OPS! Non riesco a comunicare con il server di prenotazione..");
				//window.print();
				visualizza('#page4','#page1');
			}
		});
}

function resetCampi(){
    
    $('#message').html("");
	$('#sigla').html("");
	$('#attesa').html("");
	$('#idcorsa').html("");
    $('#endmessage').html("");
    
}

function chiamaMeteo(){
	 
    $.getJSON(urlHub.meteo , function(data){
    
    var city = data.name;
    var descrizione = data.weather[0].description;
    var icona = data.weather[0].icon;
    var temperatura = data.main.temp;
    temperatura=Math.floor(temperatura);

    console.log(city + ", "+ descrizione + ", " + icona + ", "+ temperatura);
    var ico="src=\"./icone/default.png\"";
    console.log(icona);
   
    if(icona!=null){
        
    var ico= selectIcon(icona); 
    }
       
    var img = "<p><img class=\"meteo_icon\""+ ico +">";   
    var descr="<p>"+city+"<br>"+descrizione+"<br>"+temperatura+" &deg;C</p>";
               
    $('#meteo').html(img+descr);
    //stampo il risultato
	});
}

	
function selectIcon(ico){
    
    console.log("Passato:"+ico);
    //console.log(typeof(ico));
    var daRitornare="src=\"./icone/default.png\"";
    var test=ico.charAt(ico.length-1);
    //icone del giorno
    //if(test.endsWith('d')){
    if(ico.charAt(ico.length-1)==='d'){
    switch(ico){
            case("01d"): 
            daRitornare = "src=\"./icone/day/01d.png\"";
            break;
            case("02d"): 
             daRitornare = "src=\"./icone/day/02d.png\"";
            break;
            case("03d"): 
             daRitornare = "src=\"./icone/day/03d.png\"";
            break;
            case("04d"): 
             daRitornare = "src=\"./icone/day/04d.png\"";
            break;
             case("09d"): 
             daRitornare = "src=\"./icone/day/09d.png\"";
            break;
              case("10d"): 
             daRitornare = "src=\"./icone/day/10d.png\"";
            break;
              case("11d"): 
             daRitornare = "src=\"./icone/day/11d.png\"";
            break;
              case("13d"): 
             daRitornare = "src=\"./icone/day/13d.png\"";
            break;
              case("50d"): 
             daRitornare = "src=\"./icone/day/50d.png\"";
                       
        default: 
        daRitornare = "src=\"./icone/default.png\"";
    }
    }
    //icone della notte
    else{
        
         switch(ico){
        case("01n"): 
            daRitornare = "src=\"./icone/night/01n.png\"";
            break;
          case("02n"): 
             daRitornare = "src=\"./icone/night/02n.png\"";
            break;
            case("03n"): 
             daRitornare = "src=\"./icone/night/03n.png\"";
            break;
            case("04n"): 
             daRitornare = "src=\"./icone/night/04n.png\"";
            break;
             case("09n"): 
             daRitornare = "src=\"./icone/night/09n.png\"";
            break;
              case("10n"): 
             daRitornare = "src=\"./icone/night/10n.png\"";
            break;
              case("11n"): 
             daRitornare = "src=\"./icone/night/11n.png\"";
            break;
              case("13n"): 
             daRitornare = "src=\"./icone/night/13n.png\"";
            break;
              case("50n"): 
             daRitornare = "src=\"./icone/night/50n.png\"";
            break;
                          
        default: 
        daRitornare = "src=\"./icone/default.png\"";
    }
        
        
    }
    
    return daRitornare;
    
}
    


