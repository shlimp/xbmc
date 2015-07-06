from datetime import timedelta, datetime
import os
from flask import Flask
from flask.ext.cors import CORS
from flask_jsonrpc import JSONRPC
import urllib2, cStringIO, zipfile
import xmltodict
import shutil

app = Flask(__name__)
app.config.from_object('settings')
try:
    app.config.from_object('settings_local')
except:
    pass

cors = CORS(app)
jsonrpc = JSONRPC(app, app.config["RPC_PATH"])

@jsonrpc.method('get_last_next_aired')
def get_last_next_aired(tvshowid, zipfile_url):
    remote_zip = urllib2.urlopen(zipfile_url)
    zip_string = cStringIO.StringIO(remote_zip.read())
    with zipfile.ZipFile(zip_string) as zip:
        data = xmltodict.parse(zip.read("en.xml"))
        last_aired = False
        next_aired = False
        for episode in data["Data"]["Episode"]:
            if episode["FirstAired"] is not None and (datetime.strptime(episode["FirstAired"], "%Y-%m-%d")+timedelta(days=1) > datetime.now() or episode["SeasonNumber"] != 0 and isinstance(episode["FirstAired"], list)):
                if isinstance(episode["FirstAired"], unicode):
                    next_aired = episode
                    break
            if episode["FirstAired"] is not None and datetime.strptime(episode["FirstAired"], "%Y-%m-%d") < datetime.now():
                last_aired = episode
        last_aired["tvshowid"] = tvshowid
        return {"last_aired": last_aired, "next_aired": next_aired}

@jsonrpc.method("get_subtitles")
def get_subtitles():
    response = urllib2.urlopen("http://subscenter.cinemast.com/he/feeds/movies/latest/")
    return xmltodict.parse(response.read())

@jsonrpc.method("delete_movie")
def delete_movie(path):
    folder = os.path.dirname(os.path.abspath(path))
    shutil.rmtree(folder)
    return True




if __name__ == '__main__':
    app.run(host='0.0.0.0')