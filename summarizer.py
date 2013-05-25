#!/usr/bin/env python2.7
from summary import extract
from rfc3987 import parse
import urllib
import json
try:
    uri = raw_input()
    parse(uri,rule='IRI')
    page = urllib.urlopen(uri).read()
    res = extract(page)
    out = {'url':uri, 'summary':res['body']}
    print json.dumps(out)
except Exception as e:
    print e
