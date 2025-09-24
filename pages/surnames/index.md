---
layout: templates/basic.njk
title: Surnames
pagination:
  data: surnames.allSurnames
  size: 30
---

## Surnames

{% if pagination.pageNumber == 0 %}
### Top 10 Surnames

These are the top 10 most common surnames found within the data.

{% for surname in surnames.top10Surnames -%}
  - [{{surname.surname}}](/surnames/{{surname.slug}}) ({{surname.count}})
{% endfor %}
{% endif %}

### All Surnames

{% for surname in pagination.items -%}
  - [{{surname.surname}}](/surnames/{{surname.slug}}) ({{surname.count}})
{% endfor %}


{% if pagination.href.previous %}[Previous]({{pagination.href.previous}}){% else %}Previous{% endif %} | {% if pagination.href.next %}[Next]({{pagination.href.next}}){% else %}Next{% endif %}
