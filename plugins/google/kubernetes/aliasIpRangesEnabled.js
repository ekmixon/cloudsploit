var async = require('async');
var helpers = require('../../../helpers/google');

module.exports = {
    title: 'Alias IP Ranges Enabled',
    category: 'Kubernetes',
    domain: 'Containers',
    description: 'Ensures all Kubernetes clusters have alias IP ranges enabled',
    more_info: 'Alias IP ranges allow users to assign ranges of internal IP addresses as alias to a network interface.',
    link: 'https://cloud.google.com/monitoring/kubernetes-engine/',
    recommended_action: 'Ensure that Kubernetes clusters have alias IP ranges enabled.',
    apis: ['clusters:kubernetes:list'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions();

        let projects = helpers.addSource(cache, source,
            ['projects','get', 'global']);

        if (!projects || projects.err || !projects.data || !projects.data.length) {
            helpers.addResult(results, 3,
                'Unable to query for projects: ' + helpers.addError(projects), 'global', null, null, (projects) ? projects.err : null);
            return callback(null, results, source);
        }

        var project = projects.data[0].name;

        async.each(regions.clusters.kubernetes, function(region, rcb){
            let clusters = helpers.addSource(cache, source,
                ['clusters', 'kubernetes', 'list', region]);

            if (!clusters) return rcb();

            if (clusters.err || !clusters.data) {
                helpers.addResult(results, 3, 'Unable to query Kubernetes clusters', region, null, null, clusters.err);
                return rcb();
            }

            if (!clusters.data.length) {
                helpers.addResult(results, 0, 'No Kubernetes clusters found', region);
                return rcb();
            }

            clusters.data.forEach(cluster => {
                let location;
                if (cluster.locations) {
                    location = cluster.locations.length === 1 ? cluster.locations[0] : cluster.locations[0].substring(0, cluster.locations[0].length - 2);
                } else location = region;

                let resource = helpers.createResourceName('clusters', cluster.name, project, 'location', location);
                if (cluster.ipAllocationPolicy &&
                    cluster.ipAllocationPolicy.useIpAliases) {
                    helpers.addResult(results, 0, 'Kubernetes alias IP ranges enabled', region, resource);
                } else {
                    helpers.addResult(results, 2, 'Kubernetes alias IP ranges disabled', region, resource);

                }
            });

            rcb();
        }, function(){
            // Global checking goes here
            callback(null, results, source);
        });
    }
};