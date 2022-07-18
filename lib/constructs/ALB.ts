import { Construct } from 'constructs';
import { CfnTargetGroup, Protocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { CfnLaunchTemplate, CfnSecurityGroup, CfnVPC } from 'aws-cdk-lib/aws-ec2';
import { Fn } from 'aws-cdk-lib';
import { Subnet } from './Subnet';
import { CfnInstanceProfile, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

interface ALBProps {
    websg: CfnSecurityGroup,
    subnets: Subnet,
    vpc: CfnVPC,
    bucket: Bucket
}

export class ALB extends Construct {
    constructor(scope: Construct, id: string, props: ALBProps) {
        super(scope, id)

        const { vpc, bucket, subnets, websg } = props

        // Web AMI
        const imageId = 'ami-0cff7528ff583bf9a'

        // Role for EC2 Instance Profile
        const role = new Role(this, 'webRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            description: 'Role for web instances',
        });

        role.addToPolicy(new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [`${bucket.bucketArn}/*`]
        }))

        const webInstanceProfile = new CfnInstanceProfile(this, 'webInstanceProfile', {
            roles: [role.roleName],
            instanceProfileName: 'webInstanceProfile',
        });

        // User Data script to copy DB endpoint to web folder
        const userData = Fn.base64(`#!/usr/bin/env bash
        curl -O https://streambox-cdi.s3-us-west-2.amazonaws.com/latest/linux/InstallSbxCDI.tgz
        tar xzf InstallSbxCDI.tgz
        cd InstallSbxCDI
        ./installweb
        ./installefa
        ./installsbx
        ./sanity_check`
        )

        // Launch Template
        const launchTemplateData: CfnLaunchTemplate.LaunchTemplateDataProperty = {
            imageId, // Amazon Linux 2 with Apache, PHP and the website 
            instanceType: 't2.micro',
            iamInstanceProfile: {
                arn: webInstanceProfile.attrArn
            },
            networkInterfaces: [{
                associatePublicIpAddress: true,
                deviceIndex: 0,
                groups: [websg.attrGroupId],
                subnetId: subnets.webA.attrSubnetId,
            }],
            keyName: 'streambox-us-east-1',
            userData
        }

        const launchTemplate = new CfnLaunchTemplate(this, 'launch-template', {
            launchTemplateData,
            launchTemplateName: 'launch-template'
        })

        const instance1 = new ec2.CfnInstance(this, 'Instance1', {
            launchTemplate: {
                launchTemplateId: launchTemplate.ref,
                version: launchTemplate.attrLatestVersionNumber,
            },
            availabilityZone: subnets.webA.availabilityZone
        })
    }
}