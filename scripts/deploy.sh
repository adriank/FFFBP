s3cmd put build/* s3://acf.acimg.eu/js/
s3cmd setacl s3://acf.acimg.eu/js/ --acl-public --recursive