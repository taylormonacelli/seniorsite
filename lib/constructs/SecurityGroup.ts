import { CfnSecurityGroup, CfnVPC, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

interface SGProps { vpc: CfnVPC }

export class SecurityGroup extends Construct {
    public readonly web: CfnSecurityGroup

    constructor(scope: Construct, id: string, props: SGProps) {
        super(scope, id)
        const vpcId = props.vpc.ref

        const webserverSG = new ec2.SecurityGroup(this, 'web-server-sg', {
            vpc,
            allowAllOutbound: true,
            description: 'security group for a web server',
          });



        // Web Security Group
        this.web = new CfnSecurityGroup(this, `web-sg`, {
            vpcId,
            groupDescription: `web-sg`,
            groupName: `web-sg`,
            tags: [{ key: "Name", value: `web-sg` }],
            securityGroupIngress: [{
                cidrIp: '0.0.0.0/0',
                description: 'Allow HTTP access from the internet',
                ipProtocol: 'tcp',
                fromPort: 80,
                toPort: 80
            }, {
                cidrIp: '0.0.0.0/0',
                description: 'Allow HTTPS access from the internet',
                ipProtocol: 'tcp',
                fromPort: 443,
                toPort: 443
            }, {
                cidrIp: '0.0.0.0/0',
                description: 'Allow SSH access from the internet',
                ipProtocol: 'tcp',
                fromPort: 22,
                toPort: 22
            }]
        })
    }
}