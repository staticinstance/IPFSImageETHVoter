const IPFSImageVoter = artifacts.require('./IPFSImageVoter.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('IPFSImageVoter', ([deployer, author, tipper]) => {
  let ipfsimagevoter

  before(async () => {
    ipfsimagevoter = await IPFSImageVoter.deployed()
  })

  describe('deployment', async () => {
    it('deploys successfully', async () => {
      const address = await ipfsimagevoter.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it('has a name', async () => {
      const name = await ipfsimagevoter.name()
      assert.equal(name, 'IPFSImageVoter')
    })
  })

  describe('images', async () => {
    let result, imageCount
    const hash = 'QmV8cfu6n4NT5xRr2AHdKxFMTZEJrA44qgrBCr739BN9Wb'

    before(async () => {
      result = await ipfsimagevoter.uploadImage(hash, 'Image description', { from: author })
      imageCount = await ipfsimagevoter.imageCount()
    })

    //check event
    it('creates images', async () => {
      // SUCESS
      assert.equal(imageCount, 1)
      const event = result.logs[0].args
      assert.equal(event.id.toNumber(), imageCount.toNumber(), 'id is correct')
      assert.equal(event.hash, hash, 'Hash is correct')
      assert.equal(event.description, 'Image description', 'description is correct')
      assert.equal(event.tipAmount, '0', 'tip amount is correct')
      assert.equal(event.author, author, 'author is correct')

      // FAILURE: Image must have hash
      await ipfsimagevoter.uploadImage('', 'Image description', { from: author }).should.be.rejected;

      // FAILURE: Image must have description
      await ipfsimagevoter.uploadImage('Image hash', '', { from: author }).should.be.rejected;
    })

    //check from Struct
    it('lists images', async () => {
      const image = await ipfsimagevoter.images(imageCount)
      assert.equal(image.id.toNumber(), imageCount.toNumber(), 'id is correct')
      assert.equal(image.hash, hash, 'Hash is correct')
      assert.equal(image.description, 'Image description', 'description is correct')
      assert.equal(image.tipAmount, '0', 'tip amount is correct')
      assert.equal(image.author, author, 'author is correct')
    })

    it('allows users to tip images', async () => {
      // Track the author balance before purchase
      let oldAuthorBalance
      oldAuthorBalance = await web3.eth.getBalance(author)
      oldAuthorBalance = new web3.utils.BN(oldAuthorBalance)

      result = await ipfsimagevoter.tipImageOwner(imageCount, { from: tipper, value: web3.utils.toWei('1', 'Ether') })

      // SUCCESS
      const event = result.logs[0].args
      assert.equal(event.id.toNumber(), imageCount.toNumber(), 'id is correct')
      assert.equal(event.hash, hash, 'Hash is correct')
      assert.equal(event.description, 'Image description', 'description is correct')
      assert.equal(event.tipAmount, '1000000000000000000', 'tip amount is correct')
      assert.equal(event.author, author, 'author is correct')

      // Check that author received funds
      let newAuthorBalance
      newAuthorBalance = await web3.eth.getBalance(author)
      newAuthorBalance = new web3.utils.BN(newAuthorBalance)

      let tipImageOwner
      tipImageOwner = web3.utils.toWei('1', 'Ether')
      tipImageOwner = new web3.utils.BN(tipImageOwner)

      const expectedBalance = oldAuthorBalance.add(tipImageOwner)

      assert.equal(newAuthorBalance.toString(), expectedBalance.toString())

      // FAILURE: Tries to tip a image that does not exist
      await ipfsimagevoter.tipImageOwner(99, { from: tipper, value: web3.utils.toWei('1', 'Ether')}).should.be.rejected;
    })
  })
})