from jinja2 import Environment, BaseLoader, select_autoescape

class TemplateService:
    def __init__(self):
        # BaseLoader does not load from files, perfect for string templates
        self.env = Environment(
            loader=BaseLoader(),
            autoescape=True
        )

    def render(self, subject_template: str, body_template: str, context: dict) -> tuple[str, str]:
        """
        Renders subject and body templates using the provided context.
        """
        try:
            subject_tmpl = self.env.from_string(subject_template)
            rendered_subject = subject_tmpl.render(**context)

            body_tmpl = self.env.from_string(body_template)
            rendered_body = body_tmpl.render(**context)

            return rendered_subject, rendered_body
        except Exception as e:
            # Re-raise or log as needed
            raise ValueError(f"Template rendering failed: {str(e)}")

template_service = TemplateService()
