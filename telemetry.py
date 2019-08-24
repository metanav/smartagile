import uuid
import sys
import paho.mqtt.client as mqtt
import configparser
import json
import logging
import requests
import time
from datetime import datetime

from logging.handlers import TimedRotatingFileHandler

config = configparser.ConfigParser()
config.read('config.ini')
logger = logging.getLogger("Rotating Log")
logger.setLevel(logging.INFO)
handler = TimedRotatingFileHandler('readings.log', when='d', interval=1, backupCount=5)
logger.addHandler(handler)
 
last_msg_ts = time.time()

def get_device_state():
    headers  = {'Content-Type': 'application/json', 'Authorization': 'Bearer {0}'.format(config['credentials']['api_token'])}
    api_url  = '{}/devices/{}/state'.format(config['urls']['rest_api'], 'TO136-02021000010009F4') 
    response = requests.get(api_url, headers=headers)

    if response.status_code == 200:
        return json.loads(response.content.decode('utf-8'))
    else:
        return None

def get_topic(topic_id):
    return '/v1/users/{user_id}/in/devices/{device_id}/datasources/{topic_id}'.format(
        user_id=config['credentials']['user_id'],
        device_id=config['credentials']['device_id'],
        topic_id=topic_id)

def on_connect(client, userdata, flags, rc):
    now = str(datetime.now())
    print('{now}\ton_connect result code {code}'.format(now=now,code=rc))

    for _, topic_id in config.items('topics'):
        client.subscribe(get_topic(topic_id))

def on_disconnect(client, userdata, rc):
    now = str(datetime.now())
    if rc != 0:
        print('{}\tUnexpected disconnection with code = {}'.format(now, rc))
    
def on_message(client, userdata, msg):
    now = str(datetime.now())
    #print('{now}\tMsg received from topic={topic}\n{content}'.format(now=now, topic=msg.topic, content=str(msg.payload)))
    topic_id = msg.topic.split('/')[-1]
    payload = json.loads(msg.payload)

    for p in payload:
        logger.info('{}\t{}\t{}'.format(topic_id, p['timestamp'], p['scalar']))

    last_msg_ts = time.time()

def on_log(client, userdata, level, buf):
    now = str(datetime.now())
    print('{}\t{}'.format(now, buf))

    # Check the device state on PINGREQ
    if buf == 'Sending PINGREQ' and ((time.time() - last_msg_ts) > 120):
        device_state = get_device_state()
        if device_state['connectionState']  == 'CONNECTED':
            print('Device is connected')
        else:
            print('Device is NOT connected')
            

def on_subscribe(client, userdata, mid, granted_qos):
    print('on_subscribe: mid={}\tgranted_qos={}'.format(mid, granted_qos))

def on_unsubscribe(client, userdata, mid):
    print('on_unsubscribe: mid={}'.format(mid))


if __name__ == "__main__":

    client = mqtt.Client(client_id=str(uuid.uuid4()), clean_session=False, transport='websockets')
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.on_log = on_log
    client.on_subscribe = on_subscribe
    client.on_unsubscribe = on_unsubscribe

    client.tls_set(ca_certs='./cacert.crt')
    client.username_pw_set(config['credentials']['mqtt_user_name'], config['credentials']['api_token'])
    client.connect(config['urls']['mqtt_api'], 443, keepalive=57)

    client.loop_forever()

