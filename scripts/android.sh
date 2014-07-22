#!/bin/sh

cmd=${1:? "$0 requires \"cmd\" as first argument"}

path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
working_path=$path/..

name="Crownstone"
name1="CrownStone"
package_prefix="nl.dobots"

# working path, should be parent directory of script directory
echo "Navigate to working path: $working_path"
cd $working_path

build() {
	cordova build android
}

upload() {
	adb uninstall $package_prefix.$name1
	adb install platforms/android/ant-build/$name-debug.apk
	start
}

start() {
	adb shell am start -n $package_prefix.$name1/.$name
}

log() {
	adb logcat -s "CordovaLog" -t 0
}

all() {
	build
	sleep 1
	upload
	sleep 1
	log
}

case "$cmd" in 
	build)
		build
		;;
	upload)
		upload
		;;
	start)
		start
		;;
	log)
		log
		;;
	all)
		all
		;;
	*)
		echo $"Usage: $0 {build|upload|log}"
		exit 1
esac
