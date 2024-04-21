#!/bin/bash

# Refer: http://www.linuxfoundation.org/collaborate/workgroups/networking/netem#Delaying_only_some_traffic
# Refer: http://www.bomisofmab.com/blog/?p=100
# Refer: http://drija.com/linux/41983/simulating-a-low-bandwidth-high-latency-network-connection-on-linux/
# Refer: https://gist.github.com/trongthanh/1196596

case "$1" in                                                                                                                                                  
  start)
    # Setup the rate control and delay
    sudo tc qdisc add dev lo root handle 1: htb default 12
    sudo tc class add dev lo parent 1:1 classid 1:12 htb rate 1mbps ceil 2mbps
    sudo tc qdisc add dev lo parent 1:12 netem delay 15ms
  ;;      
 
  stop)
    # Remove the rate control/delay
    sudo tc qdisc del dev lo root
  ;;                                  
                                                           
  status)                                                                            
    # To see what is configured on an interface, do this 
    tc -s qdisc ls dev lo
  ;;
       
  *)                               
    echo "usage: $0 <start|stop|status>"
  ;;
esac