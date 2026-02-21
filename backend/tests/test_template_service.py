import pytest
from app.services.template_service import template_service

def test_render_basic_variables():
    subject = "Hello {{FirstName}}"
    body = "<p>Hi {{FirstName}}, working at {{Company}} as {{Title}}?</p>"
    context = {
        "FirstName": "John",
        "Company": "Acme Corp",
        "Title": "CEO"
    }

    s, b = template_service.render(subject, body, context)
    assert s == "Hello John"
    assert b == "<p>Hi John, working at Acme Corp as CEO?</p>"

def test_render_missing_variables():
    # Jinja2 default behavior: undefined variables become empty strings
    subject = "Hello {{FirstName}}"
    body = "Body"
    context = {}

    s, b = template_service.render(subject, body, context)
    assert s == "Hello "
    assert b == "Body"

def test_render_html_escaping():
    subject = "Test"
    body = "Hello {{Name}}"
    context = {"Name": "<script>alert(1)</script>"}

    s, b = template_service.render(subject, body, context)
    assert b == "Hello &lt;script&gt;alert(1)&lt;/script&gt;"

def test_render_invalid_template():
    subject = "Hello {{ FirstName"  # Syntax error
    body = "Body"
    context = {"FirstName": "John"}

    with pytest.raises(ValueError):
        template_service.render(subject, body, context)
