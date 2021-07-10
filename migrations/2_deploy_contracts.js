const IPFSImageVoter = artifacts.require("IPFSImageVoter");

module.exports = function(deployer) {
  deployer.deploy(IPFSImageVoter);
};