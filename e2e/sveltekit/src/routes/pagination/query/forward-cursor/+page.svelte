<script lang="ts">
  import { CachePolicy, graphql, type ForwardCursorPaginationQueryStore } from '$houdini';

  const result: ForwardCursorPaginationQueryStore = graphql`
    query ForwardCursorPaginationQuery {
      usersConnection(first: 2, snapshot: "pagination-query-forwards-cursor") @paginate {
        edges {
          node {
            name
          }
        }
      }
    }
  `;
</script>

<div id="result">
  {$result.data?.usersConnection.edges.map(({ node }) => node?.name).join(', ')}
</div>

<div id="pageInfo">
  {JSON.stringify($result.pageInfo)}
</div>

<button id="next" on:click={() => result.loadNextPage()}>next</button>

<button id="refetch" on:click={() => result.fetch({ policy: CachePolicy.NetworkOnly })}
  >refetch</button
>
