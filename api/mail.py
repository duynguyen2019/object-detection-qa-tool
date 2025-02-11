from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import COMMASPACE, formatdate
from email import encoders
import smtplib
import pandas as pd

# Function to be used later in sending email
def send_mail(send_from, send_to, subject, text, filename=None, server="localhost"):
    msg = MIMEMultipart()
    
    msg['From'] = send_from
    msg['To'] = COMMASPACE.join(send_to)
    msg['Date'] = formatdate(localtime=True)
    msg['Subject'] = subject
    
    msg_content = MIMEText(text)
    msg.attach(msg_content)
    
    if filename is not None:
        attachment = open(filename,"rb")
        p = MIMEBase('application','octet-stream')
        p.set_payload((attachment).read())
        encoders.encode_base64(p)
        p.add_header('Content-Disposition','attachment; filename= %s' % filename.split("/")[-1])
        msg.attach(p)

    smtp = smtplib.SMTP(server)
    smtp.sendmail(send_from, send_to, msg.as_string())
    smtp.close()


def data_receipt(send_from, always_send_to, login_name, login_email, login_affiliation, dtype, region, estuaryclass, mpastatus, estuarytype, estuaryname, projectid, year, originalfile, eng, mailserver, *args, **kwargs):
    """
    Depending on the project, this function will likely need to be modified. In some cases there are agencies and data owners that
    must be incuded in the email body or subject.

    send_from must be a string, like admin@chceker.sccwrp.org
    always_send_to are the email addresses which will always receive the email, which may or may not always be the maintainers
    login_email is the email the user logged in with
    dtype is the data type they submitted data for
    submissionid is self explanatory
    tables is the list of all tables they submitted data to
    eng is the database connection to confirm the records were loaded
    mailserver is the server that will be used to send the email
    """

    email_subject = f"EMPA Advanced Data Query Notification"
    email_body = f"There was a data download from EMPA Advanced Data Query \n\n"
    email_body += f"User's Name: {login_name}\n\n"
    email_body += f"User's Email: {login_email}\n\n"
    email_body += f"User's Affiliation: {login_affiliation}\n\n"
    email_body += f"Region: {region}\n\n"
    email_body += f"Estuary Classes: {estuaryclass}\n\n"
    email_body += f"MPA Status: {mpastatus}\n\n"
    email_body += f"Estuary Types: {estuarytype}\n\n"
    email_body += f"Estuaries: {estuaryname}\n\n"
    email_body += f"ProjectIDs: {projectid}\n\n"
    email_body += f"Years: {year}\n\n"
    email_body += f"SOPs: {dtype}\n\n"
    # email_body += f"Date Received: {pd.Timestamp(submissionid, unit = 's').strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    # email_body += "Session Login Information:\n\t"
    # for k,v in login_info.items():
    #     email_body += f"{k}: {v}\n\t"
    # email_body += "\n\n"
    # email_body += "\n".join(
    #     [
    #         f"""{pd.read_sql(f'SELECT COUNT(*) AS n_records FROM "{tbl}" WHERE submissionid = {submissionid};', eng).n_records.values[0]} records loaded to {tbl}"""
    #         for tbl in tables 
    #     ]
    # )

    send_mail(send_from, [*always_send_to], email_subject, email_body, filename = originalfile, server = mailserver)
