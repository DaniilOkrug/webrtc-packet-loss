#!/bin/bash

node ../fecVideoReciever.js &

PID=$!

sudo tc qdisc add dev eth0 root netem rate 3mbps
sleep 5

sudo tc qdisc del dev eth0 root netem
# sleep 5

# kill $PID
