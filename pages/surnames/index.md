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



<div class="pager not-prose flex justify-between mt-6">
{% if pagination.href.previous %}<a href="{{pagination.href.previous}}">← Previous</a>{% else %}<span>← Previous</span>{% endif %}
{% if pagination.href.next %}<a href="{{pagination.href.next}}">Next →</a>{% else %}<span>Next →</span>{% endif %}
</div>
