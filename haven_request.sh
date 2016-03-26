#!/bin/bash
command="curl"
for ((i=3; i <= $#; i++))
do
    command="$command --data-urlencode \"${!i}\""
done
command="$command \"https://api.havenondemand.com/1/api/$1/$2/v1?apikey=85295d8c-c280-4a6b-9cb3-f62402af1ebc\""
eval $command 2> /dev/null
