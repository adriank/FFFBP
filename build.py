#!/usr/bin/python

import httplib, urllib, sys

# Define the parameters for the POST request and encode them in
# a URL-safe format.

def openFile(fileName):
	f=open("src/"+fileName+".js")
	s=""
	for l in f:
		s+=l
	return s

def delDebug(s):
	r=""
	for l in s.split("\n"):
		if l.find("console") is -1:
			r+=l+"\n"
	return r#.join("\n")

def shorten(s):

	params = urllib.urlencode([
			('js_code', s),
			('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
			('output_format', 'text'),
			('output_info', 'compiled_code'),
		])

	# Always use the following value for the Content-type header.
	headers = { "Content-type": "application/x-www-form-urlencoded" }
	conn = httplib.HTTPConnection('closure-compiler.appspot.com')
	conn.request('POST', '/compile', params, headers)
	response = conn.getresponse()
	data = response.read()
	conn.close()
	return data

l="// LICENSE: MIT, copyright Adrian Kalbarczyk 2010-1016\n"

a=openFile("utils")
#b=openFile("spinner")
c=openFile("ac")

merged = a+c
open("build/fffbp.debug.js","w").write(l+merged)
debugDeleted = delDebug(merged)
open("build/fffbp.js","w").write(l+debugDeleted)
minified = shorten(debugDeleted)
open("build/fffbp.min.js","w").write(l+minified)
