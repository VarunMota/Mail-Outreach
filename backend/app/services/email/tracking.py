from bs4 import BeautifulSoup
import urllib.parse
from ...config import settings

class EmailTracking:
    @staticmethod
    def inject_tracking(html_body: str, campaign_contact_id: int) -> str:
        """
        Injects a tracking pixel and rewrites links for click tracking.
        """
        soup = BeautifulSoup(html_body, 'html.parser')

        # 1. Inject Tracking Pixel
        # <img src="{BASE_URL}/api/v1/track/open/{campaign_contact_id}" width="1" height="1" style="display:none;" />
        pixel_url = f"{settings.BASE_URL}/api/v1/track/open/{campaign_contact_id}"
        img_tag = soup.new_tag("img", src=pixel_url, width="1", height="1")
        img_tag['style'] = "display:none;"
        
        if soup.body:
            soup.body.append(img_tag)
        else:
            soup.append(img_tag)

        # 2. Rewrite Links
        # {BASE_URL}/api/v1/track/click/{campaign_contact_id}?url={original_url}
        for a_tag in soup.find_all('a', href=True):
            original_url = a_tag['href']
            # Skip mailto, tel, or anchors
            if original_url.startswith(('mailto:', 'tel:', '#')):
                continue
            
            encoded_url = urllib.parse.quote(original_url)
            tracking_url = f"{settings.BASE_URL}/api/v1/track/click/{campaign_contact_id}?url={encoded_url}"
            a_tag['href'] = tracking_url

        return str(soup)

email_tracking = EmailTracking()
