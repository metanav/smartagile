(function() {
    var vm = new Vue({
        el: '#app',
        data: {
          client: null,
          message: '',
          response: ''
        },
        created: function () {
          // Create a client instance
          this.client = new Paho.MQTT.Client('ns01-wss.brainium.com', 443,  'smartagileclientv1.3');

          // set callback handlers
          this.client.onConnectionLost = this.onConnectionLost;
          this.client.onMessageArrived = this.onMessageArrived;

          mqtt_user_name = 'oauth2-user';
          api_token = "your api token"

          // connect the client
          this.client.connect({
              userName: mqtt_user_name,
              password: api_token,
              timeout: 3,
              useSSL:  true,
              onSuccess: this.onConnect,
              onFailure: this.onFailure
          });

          var trace1 = {
            x: [],
            y: [],
            mode: 'lines',
            line: {color: '#80CAF6'}
          }; 

          var trace2 = {
            x: [],
            y: [],
            yaxis: 'y2',
            mode: 'lines',
            line: {color: '#FF00E0'}
          }; 

          var data = [trace1, trace2];
          var layout = {
            title: 'Smart Agile',
            showlegend: true,
            yaxis: {
              domain: [0, 0.5]
            },
            yaxis2: {
              domain: [0.6, 1]
            },
            annotations: [{
              text: 'Proximity',
              font: {
                size: 16,
                color: 'green',
              },
              showarrow: false,
              align: 'center',
              x: 0.1, 
              y: 1.1,
              xref: 'paper',
              yref: 'paper'
            },
            {
              text: 'Temperature',
              font: {
                size: 16,
                color: 'green',
              },
              showarrow: false,
              align: 'center',
              x: 0.1,
              y: 0.55, 
              xref: 'paper',
              yref: 'paper'
            }]
          }
          
        
          Plotly.newPlot('graph', data, layout, {displayModeBar: false});
        },
        methods: {
              // called when the client connects
              onConnect: function() {
                // Once a connection has been made, make a subscription and send a message.
                this.message = "Connected";
                this.client.subscribe('/v1/users/user_id/in/devices/device_id/datasources/HUMIDITY_TEMPERATURE');
                //this.client.subscribe('/v1/users/user_id/in/devices/device_id/datasources/PROXIMITY');
              },
              onFailure: function(message) {
                this.message = "onFailure" + message;
                console.log(message);
              },
              // called when the client loses its connection
              onConnectionLost: function(responseObject) {
                if (responseObject.errorCode !== 0) {
                  this.message = "onConnectionLost:" + responseObject.errorMessage;
                }
              },
              // called when a message arrives
              onMessageArrived: function(message) {
                console.log(message.topic);
                this.payload = JSON.parse(message.payloadString);
                var timestamps = payload.map(obj => new Date(obj.timestamp));
                var values = payload.map(obj => obj.scalar);
                var update = {
                  x: [timestamps, timestamps],
                  y: [values, values.map(a => a+1)],
                }

                var time = timestamps[0];
                var olderTime = time.setMinutes(time.getMinutes() - 1);
                var futureTime = time.setMinutes(time.getMinutes() + 1);
              
                var minuteView = {
                      xaxis: {
                        type: 'date',
                        range: [olderTime,futureTime]
                      }
                    };

              
                Plotly.relayout('graph', minuteView);
                Plotly.extendTraces('graph', update, [0, 1])
              }
        }
    })
})();




